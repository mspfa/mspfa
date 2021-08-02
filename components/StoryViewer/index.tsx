import Page from 'components/Page';
import type { ClientStoryPage, PublicStory } from 'modules/client/stories';
import Link from 'components/Link';
import { useRouter } from 'next/router';
import type { ReactNode } from 'react';
import { useState, useEffect } from 'react';
import type { StoryPageID } from 'modules/server/stories';
import BBCode, { sanitizeBBCode } from 'components/BBCode';

/**
 * The number of next pages to preload ahead of the user's current page.
 *
 * For example, if this is 2 and the user is on page 10, then pages 10 to 12 will be preloaded (assuming page 10 only links to page 11 and page 11 only links to page 12).
 */
export const PAGE_PRELOAD_DEPTH = 5;

/** Returns an HTML string of the sanitized `page.content` BBCode. */
const sanitizePageContent = (page: ClientStoryPage) => sanitizeBBCode(page.content, { html: true });

export type StoryViewerProps = {
	story: PublicStory,
	/**
	 * The initial record of pages to cache.
	 *
	 * If a page ID maps to `null`, then the page does not exist to the client, letting the client know not to try to request it.
	 */
	pages: Partial<Record<StoryPageID, ClientStoryPage | null>>
};

const StoryViewer = ({
	story,
	pages: initialPages
}: StoryViewerProps) => {
	const router = useRouter();
	const pageID = (
		typeof router.query.p === 'string'
			? +router.query.p
			: 1
	);

	// This state is record of cached pages.
	// If a page ID maps to `null`, then the page does not exist to this client, letting it know not to try to request it.
	// If a page ID's value is undefined, then it has not been cached or requested yet.
	const [pages, setPages] = useState(initialPages);
	const page = pages[pageID];

	// This state is a ref to a partial record that maps each cached page ID to an HTML string of its sanitized `content`, as a caching optimization due to the performance cost of BBCode sanitization.
	const [pageContents, setPageContents] = useState<Partial<Record<StoryPageID, string>>>({});
	// Mutate `pageContents` to load this page's sanitized contents synchronously.
	if (page && !pageContents[pageID]) {
		pageContents[pageID] = sanitizePageContent(page);
	}

	// Cache new pages and preload the BBCode and images of cached pages.
	// None of this should be done server-side, because anything cached or preloaded server-side would be unnecessary as it would not be sent to the client.
	useEffect(() => {
		let pageContentsChanged = false;
		const newPageContents = { ...pageContents };

		for (const page of Object.values(pages)) {
			if (page && !(pageID in newPageContents)) {
				newPageContents[pageID] = sanitizePageContent(page);
				pageContentsChanged = true;
			}
		}

		if (pageContentsChanged) {
			setPageContents(newPageContents);
		}
	}, [pageID, pages, pageContents]);

	return (
		<Page>
			{story.title}<br />
			<BBCode alreadySanitized>
				{pageContents[pageID]}
			</BBCode>
		</Page>
	);
};

export default StoryViewer;