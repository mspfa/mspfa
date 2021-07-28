import validate from './index.validate';
import type { APIHandler } from 'modules/server/api';
import type { StoryDocument } from 'modules/server/stories';
import { getStoryByUnsafeID, updateStorySchedule } from 'modules/server/stories';
import { authenticate } from 'modules/server/auth';
import { Perm } from 'modules/client/perms';
import type { MatchKeysAndValues, UpdateQuery } from 'mongodb';
import type { Mutable } from 'modules/types';

const Handler: APIHandler<{
	query: {
		storyID: string,
		pageID: string
	},
	method: 'DELETE'
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

	/** The ID of the page to delete. */
	const deletedPageID = +req.query.pageID;

	if (!(deletedPageID in story.pages)) {
		res.status(404).send({
			message: 'The specified page does not exist.'
		});
		return;
	}

	const $set: Mutable<MatchKeysAndValues<StoryDocument>> = {};

	const pageValues = Object.values(story.pages);

	/** The ID of the last page (which would technically be deleted from the database as a result of being shifted down due to the requested page being deleted). */
	const lastPageID = pageValues.length;

	const updateQuery: UpdateQuery<StoryDocument> = {
		// Delete the page from the database.
		$unset: {
			[`pages.${lastPageID}`]: true
		}
	};

	// Delete the page from `story` so `story.pages` is in sync with what the database will be after the `updateQuery`, allowing `story` to safely be passed into `updateStorySchedule`.
	delete story.pages[lastPageID];

	for (const page of pageValues) {
		if (page.id === deletedPageID) {
			// Skip the page being deleted.
			continue;
		}

		/** Whether this page's `nextPages` has changed. */
		let nextPagesChanged = false;

		// Adjust IDs of pages in `page.nextPages` after the deleted page.
		for (let i = 0; i < page.nextPages.length; i++) {
			if (page.nextPages[i] > deletedPageID) {
				page.nextPages[i]--;
				nextPagesChanged = true;
			}
		}

		// Adjust IDs of pages after the deleted page.
		if (page.id > deletedPageID) {
			page.id--;

			// Set this page (with its `id` and `nextPages` adjusted) into the adjusted page ID.
			$set[`pages.${page.id}`] = page;

			// Do the same in `story.pages` so it is in sync with what the database will be after the `updateQuery`, allowing `story` to safely be passed into `updateStorySchedule`.
			story.pages[page.id] = page;
		} else if (nextPagesChanged) {
			// If this page isn't already being added to `$set` due to an ID adjustment but still has a changed `nextPages`, add this page's changed `nextPages` to `$set`.
			$set[`pages.${page.id}.nextPages`] = page.nextPages;
		}
	}

	if (Object.values($set).length) {
		updateQuery.$set = $set;
	}

	await updateStorySchedule(story, updateQuery);

	// TODO: Adjust page IDs in users' gave saves.

	res.end();
};

export default Handler;