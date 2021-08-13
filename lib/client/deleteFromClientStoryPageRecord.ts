import type { StoryPageID } from 'lib/server/stories';
import type { ClientStoryPageRecord } from 'lib/client/stories';

/**
 * Deletes a page from a `ClientStoryPageRecord` by its ID, adjusting all other page IDs in the record accordingly. Returns the new `ClientStoryPageRecord`.
 *
 * Does not mutate any values passed in.
 */
const deleteFromClientStoryPageRecord = (
	/** The ID of the page to delete. */
	pageIDToDelete: StoryPageID,
	/** The record to delete the page from. */
	pages: ClientStoryPageRecord
) => {
	const newPages: ClientStoryPageRecord = {};

	for (const oldPage of Object.values(pages)) {
		if (oldPage.id === pageIDToDelete) {
			// Skip the page being deleted.
			continue;
		}

		const newPage = { ...oldPage };

		// Adjust IDs of pages after the deleted page.
		if (oldPage.id > pageIDToDelete) {
			newPage.id--;
		}

		// Adjust IDs of pages in `newPage.nextPages` after the deleted page.
		for (let i = 0; i < newPage.nextPages.length; i++) {
			if (newPage.nextPages[i] > pageIDToDelete) {
				newPage.nextPages[i]--;
			}
		}

		newPages[newPage.id] = newPage;
	}

	return newPages;
};

export default deleteFromClientStoryPageRecord;