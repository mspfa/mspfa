import validate from './index.validate';
import type { APIHandler } from 'modules/server/api';
import type { StoryPage, StoryPageID } from 'modules/server/stories';
import stories, { getStoryByUnsafeID, getClientStoryPage } from 'modules/server/stories';
import { authenticate } from 'modules/server/auth';
import { Perm } from 'modules/client/perms';
import type { ClientStoryPageRecord } from 'modules/client/stories';
import { invalidPublishedOrder } from 'modules/client/stories';

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
		 * The position to insert the pages at.
		 *
		 * For example, position 0 will insert the pages before page 1, position 1 will insert the pages after page 1, position 2 will insert the pages after page 2, and so on.
		 *
		 * @minimum 0
		 */
		position: number
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
		|| user.perms & Perm.sudoWrite
	)) {
		res.status(403).send({
			message: 'You do not have permission to edit the specified adventure.'
		});
		return;
	}

	if (!(
		req.body.position === 0
		|| req.body.position in story.pages
	)) {
		res.status(422).send({
			message: 'The specified target position is invalid.'
		});
		return;
	}

	const $set: Record<string, StoryPage> = {};

	/** A record that maps each changed page's initial ID to its new ID after the move. */
	const changedPageIDs: Record<StoryPageID, StoryPageID> = {};
	const newClientPages: ClientStoryPageRecord = {};

	// Store `Date.now()` into a variable so it is not a different value each time, helping avoid inconsistencies.
	const now = Date.now();

	/** The ID of a new page being pushed via `pushNewPage`. Automatically increments each time `pushNewPage` is called. */
	let newPageID: StoryPageID = 0;
	/** The initial page ID of the previous page passed into `pushNewPage`. */
	let previousOldPageID: StoryPageID | undefined;
	/** The `published` value of the previous page passed into `pushNewPage`. */
	let previousPublished: StoryPage['published'] | undefined;

	/**
	 * Pushes a page to the story's updated set of pages. Adjusts the page's ID and sets it into the database update. If there is an error, never resolves.
	 *
	 * This should be called on every page of this story in the order of the new requested pages. This must not set properties into `story.pages`, since that is used to hold the original pages from before the move.
	 */
	const pushNewPage = (page: StoryPage) => new Promise<void>(resolve => {
		const oldPageID = page.id;
		newPageID++;

		// Ensure that it is impossible with the new order for the `published` dates to result in gaps in published pages.
		if (
			// Page 1 can't have an invalid `published` date, so exclude it.
			newPageID !== 1
			&& invalidPublishedOrder(previousPublished, page.published, now)
		) {
			res.status(422).send({
				message: `Page ${oldPageID} should not have a \`published\` date set before page ${previousOldPageID}.`
			});
			return;
		}

		if (oldPageID !== newPageID) {
			changedPageIDs[oldPageID] = newPageID;

			// Adjust the page ID.
			page.id = newPageID;

			// Set this page (with its `id` adjusted) into the adjusted page ID in the database.
			$set[`pages.${page.id}`] = page;

			// Set the new page to be sent back to the client.
			newClientPages[page.id] = getClientStoryPage(page);
		}

		resolve();

		previousOldPageID = oldPageID;
		previousPublished = page.published;
	});

	const lastPageID = Object.values(story.pages).length;

	for (let i = 0; i <= lastPageID; i++) {
		// Ensure this index is a valid page ID.
		if (i !== 0) {
			const pageID = i;

			// If this page exists and was not requested to be moved, push it to the new pages.
			if (!req.body.pageIDs.includes(pageID)) {
				await pushNewPage(story.pages[pageID]);
			}
		}

		// Check if this index is the requested insertion position.
		if (i === req.body.position) {
			// Insert all the pages which were requested to move here, in order.
			for (const pageID of req.body.pageIDs) {
				await pushNewPage(story.pages[pageID]);
			}
		}
	}

	// TODO: Adjust `nextPages`.

	if (Object.values($set).length) {
		await stories.updateOne({
			_id: story._id
		}, { $set });

		// TODO: Adjust page IDs in users' gave saves.
	}

	res.send({
		changedPageIDs,
		changedPages: newClientPages
	});
};

export default Handler;