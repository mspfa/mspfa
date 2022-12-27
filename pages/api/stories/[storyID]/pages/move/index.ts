import validate from '../../pages/move/index.validate';
import type { APIHandler } from 'lib/server/api';
import type { ServerStory, ServerStoryPage, StoryID, StoryPageID } from 'lib/server/stories';
import stories, { getClientStoryPage } from 'lib/server/stories';
import getStoryByUnsafeID from 'lib/server/stories/getStoryByUnsafeID';
import authenticate from 'lib/server/auth/authenticate';
import Perm, { hasPerms } from 'lib/client/Perm';
import type { ClientStoryPageRecord } from 'lib/client/stories';
import invalidPublishedOrder from 'lib/client/invalidPublishedOrder';
import type { integer, Mutable } from 'lib/types';
import users from 'lib/server/users';
import type { UpdateFilter } from 'mongodb';

const Handler: APIHandler<{
	query: {
		storyID: string
	},
	method: 'POST',
	body: {
		/**
		 * The initial IDs of pages to move. After being moved, the pages will be in the same order as in this array.
		 *
		 * @uniqueItems true
		 */
		pageIDs: StoryPageID[],
		/**
		 * The index to insert the pages at.
		 *
		 * For example, index 0 will insert the pages before page 1, index 1 will insert the pages after page 1, index 2 will insert the pages after page 2, and so on.
		 *
		 * @minimum 0
		 */
		index: integer
	}
}, {
	method: 'POST',
	body: {
		/** A record that maps each changed page's initial ID to its new ID after the move. */
		changedPageIDs: Record<StoryPageID, StoryPageID>,
		/** A `ClientStoryPageRecord` of the pages which were modified. */
		changedPages: ClientStoryPageRecord
	}
}> = async (req, res) => {
	await validate(req, res);

	const { user } = await authenticate(req, res);

	if (!user) {
		res.status(403).send({
			message: 'You must be signed in to edit an adventure.'
		});
		return;
	}

	const story = await getStoryByUnsafeID(req.query.storyID, res);

	if (!(
		story.owner.equals(user._id)
		|| story.editors.some(userID => userID.equals(user._id))
		|| hasPerms(user, Perm.WRITE)
	)) {
		res.status(403).send({
			message: 'You do not have permission to edit the specified adventure.'
		});
		return;
	}

	if (!(
		req.body.index === 0
		|| req.body.index in story.pages
	)) {
		res.status(422).send({
			message: 'The specified target index is invalid.'
		});
		return;
	}

	const $set: Mutable<UpdateFilter<ServerStory>['$set']> = {};

	/** A record that maps each changed page's initial ID to its new ID after the move. */
	const changedPageIDs: Record<StoryPageID, StoryPageID> = {};
	/** An array of initial page IDs to be changed. */
	const changedOldPageIDs: StoryPageID[] = [];
	/** A record that maps each changed page's new ID from after the move to its initial ID (the reverse of `changedPageIDs`). */
	const oldPageIDs: Record<StoryPageID, StoryPageID> = {};
	const newClientPages: ClientStoryPageRecord = {};
	/** The MongoDB `$switch` operation's `branches` used to modify each user's `storySaves` entry for this story. */
	const branches: Array<{
		case: {
			$eq: [`$storySaves.${StoryID}`, StoryPageID]
		},
		then: StoryPageID
	}> = [];

	// Store the current date into a variable so it is not a different value each time, helping avoid inconsistencies.
	const now = Date.now();

	/** The ID of a new page being pushed via `pushNewPage`. Automatically increments each time `pushNewPage` is called. */
	let newPageID: StoryPageID = 0;
	/** The initial page ID of the previous page passed into `pushNewPage`. */
	let previousOldPageID: StoryPageID | undefined;
	/** The previous page passed into `pushNewPage`. */
	let previousPage: ServerStoryPage | undefined;

	/**
	 * Pushes a page to the story's updated set of pages. Adjusts the page's ID and sets it into the database update. If there is an error, sends an error response and never resolves.
	 *
	 * This should be called on every page of this story in the order of the new requested pages. This must not set properties into `story.pages`, since that is used to hold the original pages from before the move.
	 */
	const pushNewPage = (page: ServerStoryPage) => new Promise<void>(resolve => {
		const oldPageID = page.id;
		newPageID++;

		if (previousPage && invalidPublishedOrder(previousPage, page, now)) {
			res.status(422).send({
				message: `Page ${oldPageID} should not have a \`published\` date set before page ${previousOldPageID}.`
			});
			return;
		}

		if (oldPageID !== newPageID) {
			changedPageIDs[oldPageID] = newPageID;
			changedOldPageIDs.push(oldPageID);
			oldPageIDs[newPageID] = oldPageID;
			branches.push({
				// If a user's save for this story is on the `oldPageID`,
				case: {
					$eq: [`$storySaves.${story._id}`, oldPageID]
				},
				// then set it to the `newPageID`.
				then: newPageID
			});

			// Adjust the page ID.
			page.id = newPageID;

			// Set this page (with its `id` adjusted) into the adjusted page ID in the database.
			$set[`pages.${page.id}`] = page;

			// Set the new page to be sent back to the client.
			newClientPages[page.id] = getClientStoryPage(page);
		}

		resolve();

		previousOldPageID = oldPageID;
		previousPage = page;
	});

	const pageValues = Object.values(story.pages);

	for (let i = 0; i <= pageValues.length; i++) {
		// Check if this index is a valid page ID.
		if (i !== 0) {
			const pageID = i;

			// If this page was not requested to be moved, push it to the new pages.
			if (!req.body.pageIDs.includes(pageID)) {
				await pushNewPage(story.pages[pageID]);
			}
		}

		// Check if this index is the requested insertion index.
		if (i === req.body.index) {
			// Insert all the pages which were requested to move here, in order.
			for (const pageID of req.body.pageIDs) {
				await pushNewPage(story.pages[pageID]);
			}
		}
	}

	// Adjust each page's `nextPages`.
	for (const page of pageValues) {
		const newPageID = page.id;
		const oldPageID = oldPageIDs[newPageID];

		/** Whether this page's `nextPages` has changed. */
		let nextPagesChanged = false;

		for (let i = 0; i < page.nextPages.length; i++) {
			/** The initial ID of this `nextPages` page. */
			const oldNextPagesID = page.nextPages[i];

			// If this link goes to the next page, adjust the ID to still link to the next page.
			if (oldNextPagesID === oldPageID + 1) {
				page.nextPages[i] = newPageID + 1;
				nextPagesChanged = true;
				continue;
			}

			// If this link goes to a page which was moved, adjust it to link to the same page at its new ID.
			if (oldNextPagesID in changedPageIDs) {
				page.nextPages[i] = changedPageIDs[oldNextPagesID];
				nextPagesChanged = true;
			}
		}

		if (
			nextPagesChanged
			// Ensure that this page's changed `nextPages` isn't already added to `$set` via the whole page being added to `$set`.
			&& !(`pages.${newPageID}` in $set)
		) {
			// Add this page's changed `nextPages` to `$set`.
			$set[`pages.${newPageID}.nextPages`] = page.nextPages;
		}
	}

	if (Object.values($set).length) {
		await stories.updateOne({
			_id: story._id
		}, { $set });

		if (changedOldPageIDs.length) {
			// Adjust page IDs in users' story saves.
			await users.updateMany({
				[`storySaves.${story._id}`]: {
					$in: changedOldPageIDs
				}
			}, [{
				$set: {
					[`storySaves.${story._id}`]: {
						$switch: {
							branches,
							// Since at least one of the `branches` must be the case, the last one might as well be the `default` as an optimization.
							default: branches.pop()!.then
						}
					}
				}
			}]);
		}
	}

	res.send({
		changedPageIDs,
		changedPages: newClientPages
	});
};

export default Handler;
