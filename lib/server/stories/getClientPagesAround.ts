import type { ClientPreviousPageIDs } from 'components/StoryViewer';
import { PAGE_PRELOAD_DEPTH } from 'components/StoryViewer';
import type { ClientStoryPage } from 'lib/client/stories';
import type { DateNumber } from 'lib/types';
import type { ServerStory, StoryPageID, ServerStoryPage } from 'lib/server/stories';
import { getClientStoryPage } from 'lib/server/stories';

/** Gets information about a specified story's pages within the `PAGE_PRELOAD_DEPTH` around the specified page ID. */
const getClientPagesAround = (
	story: ServerStory,
	pageID: StoryPageID,
	/** Whether the user is in preview mode (which allows accessing unpublished pages) and has permission to be in preview mode. */
	previewMode?: boolean,
	now: DateNumber = Date.now()
) => {
	/**
	 * A record that maps each page ID to a sorted array of all page IDs before it that link to it via `nextPages`.
	 *
	 * For example, if page 6 maps to `[4, 5]`, that means pages 4 and 5 have 6 is their `nextPages`.
	 */
	const previousPageIDs: Partial<Record<StoryPageID, StoryPageID[]>> = {};

	// Compute the `previousPageIDs`.
	for (const page of Object.values(story.pages)) {
		for (const nextPageID of page.nextPages) {
			// Don't consider the `page` a previous page if it's after the `nextPageID` being linked i.e. if the page link goes backward.
			if (nextPageID < page.id) {
				continue;
			}

			if (!(nextPageID in previousPageIDs)) {
				previousPageIDs[nextPageID] = [];
			}

			previousPageIDs[nextPageID]!.push(page.id);
		}
	}

	/**
	 * A record of pages to send to the client.
	 *
	 * If a page ID maps to `null`, then the page does not exist to the client, letting the client know not to try to request it.
	 */
	const clientPages: Record<StoryPageID, ClientStoryPage | null> = {};

	/** The initial `ClientPreviousPageIDs` to send to the client. */
	const clientPreviousPageIDs: ClientPreviousPageIDs = {};

	/** Adds pages to `clientPages`, doing the same for their `previousPageIDs` and `nextPages` recursively until the recursion depth reaches the `PAGE_PRELOAD_DEPTH`. */
	const addToClientPages = (
		/** The ID of the page to add to `clientPages`. */
		pageID: StoryPageID,
		/** The recursion depth of this function call. */
		depth = 0
	) => {
		// If this page is already added, then don't continue.
		if (pageID in clientPages) {
			return;
		}

		// This is asserted as nullable because `pageID` may not index a real page.
		const serverPage = story.pages[pageID] as ServerStoryPage | undefined;

		// If this page doesn't exist or the user doesn't have access to it, then set it to `null` and don't continue.
		if (!serverPage || (
			!previewMode && (
				// Check if this page is not public.
				serverPage.published === undefined || +serverPage.published > now
			)
		)) {
			clientPages[pageID] = null;
			return;
		}

		const clientPage = getClientStoryPage(story.pages[pageID]);

		// Add the `clientPage` to `clientPages`.
		clientPages[pageID] = clientPage;
		// Add the first of the `clientPage`'s `previousPageIDs` to `clientPreviousPageIDs`, or `null` if this page has no previous pages.
		clientPreviousPageIDs[pageID] = previousPageIDs[pageID]?.[0] || null;

		if (++depth > PAGE_PRELOAD_DEPTH) {
			// If this iteration has reached the `PAGE_PRELOAD_DEPTH`, don't iterate any deeper.
			return;
		}

		// Call this function on each of this page's `nextPages`.
		for (const nextPageID of clientPage.nextPages) {
			addToClientPages(nextPageID, depth);
		}

		// Call this function on each of the `previousPageIDsOfThisPage`, if there are any.
		const previousPageIDsOfThisPage = previousPageIDs[pageID];
		if (previousPageIDsOfThisPage) {
			for (const previousPageID of previousPageIDsOfThisPage) {
				addToClientPages(previousPageID, depth);
			}
		}
	};

	addToClientPages(pageID);

	return { clientPages, clientPreviousPageIDs };
};

export default getClientPagesAround;