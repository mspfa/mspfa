import './styles.module.scss';
import Page from 'components/Page';
import type { ClientStoryPage, PublicStory } from 'modules/client/stories';
import Link from 'components/Link';
import { useRouter } from 'next/router';
import { useState, useEffect, useRef, Fragment, useCallback } from 'react';
import type { StoryPageID } from 'modules/server/stories';
import BBCode, { sanitizeBBCode } from 'components/BBCode';
import { useIsomorphicLayoutEffect } from 'react-use';
import Stick from 'components/Stick';
import Delimit from 'components/Delimit';
import Dialog from 'modules/client/Dialog';
import { setStoryNavGroup } from 'components/Nav';
import NavGroup from 'components/Nav/NavGroup';
import NavItem from 'components/Nav/NavItem';

/**
 * A partial record that maps each page ID to a page ID that links to it via `nextPages`.
 *
 * If a page ID maps to `undefined`, the page's previous page is unknown. If it maps to `null`, then the page's previous page is known not to exist.
 *
 * For example, if page 6 maps to page 5, that means page 5 has 6 is its `nextPages`, and clicking "Go Back" on page 6 will take the user to page 5.
 */
export type ClientPreviousPageIDs = Partial<Record<StoryPageID, StoryPageID | null>>;

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
	pages: Partial<Record<StoryPageID, ClientStoryPage | null>>,
	previousPageIDs: ClientPreviousPageIDs
};

const StoryViewer = ({
	story,
	pages: initialPages,
	previousPageIDs: initialPreviousPageIDs
}: StoryViewerProps) => {
	const router = useRouter();
	const pageID = (
		typeof router.query.p === 'string'
			? +router.query.p
			: 1
	);
	/** A URL query for whether the user is in preview mode, to be appended to URLs to this story. */
	const previewQuery = 'preview' in router.query ? '&preview=1' as const : '' as const;

	// This state is record of cached pages.
	// If a page ID maps to `null`, then the page does not exist to this client, letting it know not to try to request it.
	// If a page ID's value is undefined, then it has not been cached or requested yet.
	const [pages, setPages] = useState(initialPages);
	const page = pages[pageID];

	useEffect(() => {
		setStoryNavGroup(
			<NavGroup id="story">
				<NavItem id="story-log" label="Log" href={`/s/${story.id}/log`} />
				<NavItem id="story-search" label="Search" href={`/s/${story.id}/search`} />
			</NavGroup>
		);

		return () => {
			setStoryNavGroup(null);
		};
	}, [story.id]);

	const [previousPageIDs, setPreviousPageIDs] = useState(initialPreviousPageIDs);

	/** The page ID to take the user to when clicking the "Go Back" link. Unless undefined, necessarily indexes a cached page. */
	const previousPageID = previousPageIDs[pageID];

	// This state is a ref to a partial record that maps each cached page ID to an HTML string of its sanitized `content`, as a caching optimization due to the performance cost of BBCode sanitization.
	const [pageContents, setPageContents] = useState<Partial<Record<StoryPageID, string>>>({});
	// Mutate `pageContents` to load this page's sanitized contents synchronously.
	if (page && pageContents[pageID] === undefined) {
		pageContents[pageID] = sanitizePageContent(page);
	}

	// Fetch new pages, cache page BBCode, and preload the BBCode and images of cached pages.
	// None of this should be done server-side, because anything cached or preloaded server-side would be unnecessary as it would not be sent to the client.
	useEffect(() => {
		/** A partial record mapping each page ID to `true` if `fetchUnknownPages` has already been called on it. */
		const checkedForUnknownPages: Partial<Record<StoryPageID, true>> = {};

		/** Fetches unknown `previousPageIDs` and `nextPages`, doing the same for their `previousPageIDs` and `nextPages` recursively until the recursion depth reaches the `PAGE_PRELOAD_DEPTH`. */
		const fetchUnknownPages = (
			/** The page ID to check the `previousPageIDs` and `nextPages` of. */
			pageIDToCheck: StoryPageID,
			/** The recursion depth of this function call. */
			depth = 0
		) => {
			// If this page is already checked, then don't continue.
			if (checkedForUnknownPages[pageIDToCheck]) {
				return;
			}

			// Mark this `pageIDToCheck` as checked.
			checkedForUnknownPages[pageIDToCheck] = true;

			const pageToCheck = pages[pageIDToCheck];

			if (
				// If this page doesn't exist, don't bother checking it.
				pageToCheck === null
				// If this iteration has reached the `PAGE_PRELOAD_DEPTH`, don't iterate any deeper.
				|| ++depth > PAGE_PRELOAD_DEPTH
			) {
				return;
			}

			// If this page is within the `PAGE_PRELOAD_DEPTH` but isn't cached, then fetch it and don't continue.
			if (pageToCheck === undefined) {
				// TODO: Fetch the `pageIDToCheck`.
				console.log('fetch page', pageIDToCheck);

				return;
			}

			const previousPageID = previousPageIDs[pageIDToCheck];
			if (previousPageID === undefined) {
				// If the `previousPageID` is unknown, fetch it.
				// TODO: Ask the server with this page's first previous page is (via `?limit=1`).
				console.log('fetch previous page of', pageIDToCheck);
			} else if (previousPageID !== null) {
				// If the `previousPageID` is known and exists, call this function on it.
				fetchUnknownPages(previousPageID, depth);
			}

			// Iterate over each of this page's `nextPages`.
			for (const nextPageID of pageToCheck.nextPages) {
				fetchUnknownPages(nextPageID, depth);
			}
		};

		fetchUnknownPages(pageID);

		let pageContentsChanged = false;
		const newPageContents = { ...pageContents };

		// Iterate through all fetched pages.
		for (const pageValue of Object.values(pages)) {
			// If the page exists, cache its BBCode if it is not already cached.
			if (pageValue && newPageContents[pageValue.id] === undefined) {
				newPageContents[pageValue.id] = sanitizePageContent(pageValue);
				pageContentsChanged = true;
			}
		}

		// Update the cache if it changed.
		if (pageContentsChanged) {
			setPageContents(newPageContents);
		}
	}, [pageID, pages, pageContents, previousPageIDs]);

	const storyPageElementRef = useRef<HTMLDivElement>(null!);

	// Add the `panel` class to any media elements large enough to be considered a panel.
	// This is a layout effect rather than a normal effect so that media is not briefly visible at the wrong size.
	useIsomorphicLayoutEffect(() => {
		const storyPageElementStyle = window.getComputedStyle(storyPageElementRef.current);

		/** The content width of the `#story-page` element. */
		const storyPageContentWidth = (
			+storyPageElementStyle.minWidth.slice(0, -2)
			- +storyPageElementStyle.paddingLeft.slice(0, -2)
			- +storyPageElementStyle.paddingRight.slice(0, -2)
		);

		/** Adds or removes the `panel` class to an inputted element based on its size relative to the `#story-page` element. */
		const classifyPotentialPanel = (element: HTMLElement) => {
			element.classList[
				element.getBoundingClientRect().width > storyPageContentWidth
					// If and only if the element is wider than the content width of the `#story-page` element, this element should have the `panel` class.
					? 'add'
					: 'remove'
			]('panel');
		};

		/** An array of potential panel elements being listened to. */
		const listeningPotentialPanels: Array<HTMLImageElement | HTMLVideoElement> = [];

		/** Calls `classifyPotentialPanel` on the `event.target`. */
		const potentialPanelListener = (event: Event) => {
			classifyPotentialPanel(event.target as HTMLElement);
		};

		for (const tagName of ['img', 'video', 'iframe', 'canvas', 'object'] as const) {
			for (const element of storyPageElementRef.current.getElementsByTagName(tagName)) {
				// Clasify this element in case it's already loaded or it already has a set size.
				classifyPotentialPanel(element);

				if (
					element instanceof HTMLImageElement
					|| element instanceof HTMLVideoElement
				) {
					// If this element is one of the tags that can change size on load or error, then add listeners to classify potential panels on load or error.

					element.addEventListener(
						element instanceof HTMLVideoElement
							? 'loadeddata'
							: 'load',
						potentialPanelListener
					);
					element.addEventListener('error', potentialPanelListener);

					listeningPotentialPanels.push(element);
				}
			}
		}

		return () => {
			for (const element of listeningPotentialPanels) {
				element.removeEventListener(
					element instanceof HTMLVideoElement
						? 'loadeddata'
						: 'load',
					potentialPanelListener
				);
				element.removeEventListener('error', potentialPanelListener);
			}
		};
	}, [pageID]);

	return (
		<Page>
			<div className="story-page-container">
				<div
					className="story-page front"
					ref={storyPageElementRef}
				>
					<Fragment
						// This key is here to force the inner DOM to reset between different pages.
						key={pageID}
					>
						{page?.title && (
							<div className="story-page-title">
								{page.title}
							</div>
						)}
						<div className="story-page-content">
							{page === null ? (
								story.pageCount ? (
									// This page does not exist.
									<>This page does not exist.</>
								) : (
									// This story has no pages.
									<>This adventure has no pages.</>
								)
							) : page === undefined ? (
								// This page has not loaded yet.
								null
							) : (
								// This page is loaded.
								<BBCode alreadySanitized>
									{pageContents[pageID]}
								</BBCode>
							)}
						</div>
						<div className="story-page-links">
							{page?.nextPages.map((nextPageID, i) => {
								const nextPage = pages[nextPageID];

								// Only render this link if its page exists and isn't loading.
								return nextPage && (
									<div
										key={i}
										className="story-page-link-container"
									>
										<Link
											shallow
											href={`/?s=${story.id}&p=${nextPageID}${previewQuery}`}
										>
											{nextPage.title}
										</Link>
									</div>
								);
							})}
						</div>
					</Fragment>
					<div className="story-page-footer">
						{(
							// Only render the group if its children would be rendered.
							pageID !== 1
							|| previousPageID !== undefined
						) && (
							<>
								<span className="story-page-footer-group">
									<Delimit with={<Stick />}>
										{pageID !== 1 && (
											<Link
												key="start-over"
												shallow
												href={`/?s=${story.id}&p=1${previewQuery}`}
											>
												Start Over
											</Link>
										)}
										{previousPageID !== undefined && (
											<Link
												key="go-back"
												shallow
												href={`/?s=${story.id}&p=${previousPageID}${previewQuery}`}
											>
												Go Back
											</Link>
										)}
									</Delimit>
								</span>
								<span className="story-page-footer-group-delimiter" />
							</>
						)}
						<span className="story-page-footer-group">
							<Link>
								Save Game
							</Link>
							{' '}
							<Link
								onClick={
									useCallback(() => {
										new Dialog({
											id: 'help',
											title: 'Help',
											content: 'Save Game\n\nIf you\'re signed in, you can save your spot in the story. Click "Save Game", then when you return to the site, click "Load Game" to return to where you were.\n\nYour saves are stored on your MSPFA account, so you can even save and load between different devices!'
										});
									}, [])
								}
							>
								(?)
							</Link>
							<Stick />
							<Link>
								Load Game
							</Link>
							<Stick />
							<Link>
								Delete Game Data
							</Link>
						</span>
					</div>
				</div>
			</div>
		</Page>
	);
};

export default StoryViewer;