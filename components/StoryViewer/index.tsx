import './styles.module.scss';
import Page from 'components/Page';
import type { ClientStoryPage, PublicStory, StoryLogListings } from 'lib/client/stories';
import Link from 'components/Link';
import Router, { useRouter } from 'next/router';
import type { MouseEvent } from 'react';
import { useState, useEffect, useRef, Fragment } from 'react';
import useFunction from 'lib/client/useFunction';
import type { StoryPageID } from 'lib/server/stories';
import BBCode, { sanitizeBBCode } from 'components/BBCode';
import { useIsomorphicLayoutEffect, useLatest } from 'react-use';
import Stick from 'components/Stick';
import Delimit from 'components/Delimit';
import Dialog from 'lib/client/Dialog';
import { useNavStoryID } from 'components/Nav';
import { defaultSettings, getUser } from 'lib/client/users';
import shouldIgnoreControl from 'lib/client/shouldIgnoreControl';
import type { APIClient } from 'lib/client/api';
import api from 'lib/client/api';
import Basement from 'components/Basement';
import type { ClientNews } from 'lib/client/news';

type StoryPagesAPI = APIClient<typeof import('pages/api/stories/[storyID]/pages').default>;

/**
 * The maximum distance of pages to preload around the user's current page.
 *
 * For example, if this is 2 and the user is on page 10, then pages 8 to 12 will be preloaded (assuming page 10 only links to page 11 and page 11 only links to page 12).
 */
export const PAGE_PRELOAD_DEPTH = 10;

/** The maximum distance of pages to preload images of around the user's current page. */
export const IMAGE_PRELOAD_DEPTH = 2;

/** Goes to a page in the `StoryViewer` by page ID. */
export const goToPage = (pageID: StoryPageID) => {
	const url = new URL(location.href);
	url.searchParams.set('p', pageID.toString());
	Router.push(url, undefined, {
		shallow: true,
		scroll: true
	});
};

const openSaveGameHelp = () => {
	new Dialog({
		id: 'help',
		title: 'Help: Save Game',
		content: 'If you\'re signed in, you can save your spot in the story. Click "Save Game", then when you return to the site, click "Load Game" to return to where you were.\n\nYour saves are stored on your MSPFA account, so you can even save and load between different devices!'
	});
};

/**
 * A partial record that maps each page ID to a page ID before it that links to it via `nextPages`.
 *
 * If a page ID maps to `undefined`, the page's previous page is unknown. If it maps to `null`, then the page's previous page is known not to exist.
 *
 * For example, if page 6 maps to page 5, that means page 5 has 6 is its `nextPages`, and clicking "Go Back" on page 6 will take the user to page 5.
 */
export type ClientPreviousPageIDs = Partial<Record<StoryPageID, StoryPageID | null>>;

/** Returns an object with sanitized sanitized HTML strings of the page's BBCode properties. */
const sanitizePage = (page: ClientStoryPage) => ({
	title: sanitizeBBCode(page.title, { html: true }),
	content: sanitizeBBCode(page.content, { html: true }),
	commentary: sanitizeBBCode(page.commentary, { html: true })
});

export type StoryViewerProps = {
	story: PublicStory,
	/**
	 * The initial record of pages to cache.
	 *
	 * If a page ID maps to `null`, then the page does not exist to the client, letting the client know not to try to request it.
	 */
	pages: Partial<Record<StoryPageID, ClientStoryPage | null>>,
	previousPageIDs: ClientPreviousPageIDs,
	latestPages: StoryLogListings,
	newsPosts: ClientNews[]
};

const StoryViewer = ({
	story,
	pages: initialPages,
	previousPageIDs: initialPreviousPageIDs,
	...props
}: StoryViewerProps) => {
	useNavStoryID(story.id);

	const router = useRouter();
	const previewMode = 'preview' in router.query;

	// This state is record of cached pages.
	// If a page ID maps to `null`, then the page does not exist to this client, letting it know not to try to request it.
	// If a page ID's value is undefined, then it has not been cached or requested yet.
	const [pages, setPages] = useState(initialPages);
	/** A ref to the latest value of `pages` to avoid race conditions. */
	const pagesRef = useLatest(pages);

	const queriedPageID = (
		typeof router.query.p === 'string'
			? +router.query.p
			: 1
	);
	/** A ref to the last value of `pageID` (or the first if there is no last one). */
	const pageIDRef = useRef(queriedPageID);
	// Only change the `pageID` to the new `queriedPageID` if the page it references has finished loading and is now cached.
	const pageID = (
		queriedPageID in pages
			? queriedPageID
			: pageIDRef.current
	);
	pageIDRef.current = pageID;
	const page = pages[pageID];

	const [previousPageIDs, setPreviousPageIDs] = useState(initialPreviousPageIDs);
	/** The page ID to take the user to when clicking the "Go Back" link. Unless undefined, necessarily indexes a cached page. */
	const previousPageID = previousPageIDs[pageID];

	/** Goes to one of the pages in `page.nextPages` by its index therein. Returns a boolean for whether it is successful. */
	const goToNextPage = useFunction((
		/** The index of the page ID in `page.nextPages` to go to. */
		nextPageIndex = 0
	) => {
		const nextPageID = page?.nextPages[nextPageIndex];

		// If the `nextPageIndex` exists in `page.nextPages` and the `nextPageID` is cached in `pages`, then go to the `nextPageID`.
		if (nextPageID && pages[nextPageID]) {
			goToPage(nextPageID);

			// If it is not already set that the previous page of `nextPageID` is this page, then set it.
			if (previousPageIDs[nextPageID] !== page.id) {
				setPreviousPageIDs({
					...previousPageIDs,
					[nextPageID]: page.id
				});
			}

			return true;
		}

		return false;
	});

	const onClickNextPageLink = useFunction((event: MouseEvent<HTMLAnchorElement> & { target: HTMLAnchorElement }) => {
		if (goToNextPage(
			event.target.dataset.index === undefined
				? 0
				: +event.target.dataset.index
		)) {
			event.preventDefault();
		}

		// If the `goToNextPage` call is unsuccessful, don't `event.preventDefault`, and instead let the clicked link handle the page change.
	});

	// This state is a ref to a partial record that maps each cached page ID to an object with sanitized HTML strings of its BBCode properties, as a caching optimization due to the performance cost of BBCode sanitization.
	const [sanitizedPages, setSanitizedPages] = useState<Partial<Record<StoryPageID, ReturnType<typeof sanitizePage>>>>({});
	// Mutate `sanitizedPages` to load this page's sanitized contents synchronously if necessary.
	if (page && !(pageID in sanitizedPages)) {
		sanitizedPages[pageID] = sanitizePage(page);
	}
	const sanitizedPage = sanitizedPages[pageID];

	/** A ref to an array of page IDs which are currently being fetched around. */
	const fetchingPageIDsRef = useRef<StoryPageID[]>([]);

	// Fetch new pages, cache page BBCode, and preload the BBCode and images of cached pages.
	// None of this should be done server-side, because caching or preloading anything server-side would be pointless since it wouldn't be sent to the client.
	useEffect(() => {
		let unmounted = false;

		/** Whether any pages need to be fetched from the server if they aren't already being fetched. */
		let unknownPagesNearby = false;
		/** All page IDs within the `PAGE_PRELOAD_DEPTH` which should not be fetched since the client already has them. */
		const nearbyCachedPageIDs: StoryPageID[] = [];

		let sanitizedPagesChanged = false;
		const newSanitizedPages = { ...sanitizedPages };

		const preloadResourcesElement = document.getElementById('preload-resources') as HTMLDivElement;
		// Reset the preloaded images.
		/** The string to be set into `preloadResourcesElement.style.backgroundImage` to preload images. */
		let preloadBackgroundImage = '';

		/** A partial record mapping each page ID to `true` if `checkAdjacentPages` has already been called on it. */
		const checkedAdjacentPages: Partial<Record<StoryPageID, true>> = {};

		/** Fetches unknown `previousPageIDs` and `nextPages`, doing the same for their `previousPageIDs` and `nextPages` recursively until the recursion depth reaches the `PAGE_PRELOAD_DEPTH`. */
		const checkAdjacentPages = (
			/** The page ID to check the `previousPageIDs` and `nextPages` of. */
			pageIDToCheck: StoryPageID,
			/** The recursion depth of this function call. */
			depth = 0
		) => {
			// If this page is already checked, then don't continue.
			if (checkedAdjacentPages[pageIDToCheck]) {
				return;
			}

			// Mark this `pageIDToCheck` as checked.
			checkedAdjacentPages[pageIDToCheck] = true;

			const pageToCheck = pages[pageIDToCheck];

			if (pageToCheck !== undefined) {
				nearbyCachedPageIDs.push(pageIDToCheck);
			}

			if (
				// If this page doesn't exist, don't bother checking it.
				pageToCheck === null
				// If this iteration has reached the `PAGE_PRELOAD_DEPTH`, don't iterate any deeper.
				|| depth > PAGE_PRELOAD_DEPTH
			) {
				return;
			}

			if (pageToCheck === undefined) {
				// If this page is within the `PAGE_PRELOAD_DEPTH` but isn't cached, then fetch it and don't continue.
				unknownPagesNearby = true;
				return;
			}

			// If this point is reached, `pageToCheck` is non-nullable.

			// Cache this page's BBCode if it isn't already cached.
			if (!(pageToCheck.id in newSanitizedPages)) {
				newSanitizedPages[pageToCheck.id] = sanitizePage(pageToCheck);
				sanitizedPagesChanged = true;
			}

			// If this page is within the `IMAGE_PRELOAD_DEPTH`, preload its images.
			if (depth <= IMAGE_PRELOAD_DEPTH) {
				const imgTagTest = /\[img(?:(?:=(["']?).*?\1)|(?: [\w-]+=(["']?).*?\2)+)?\](.+)\[\/img\]/g;
				let imgTagMatch;
				while (imgTagMatch = imgTagTest.exec(pageToCheck.content)) {
					const imageURL = imgTagMatch[3];

					// Add this image to the preloaded images.
					// To improve performance, we append to a string to be set all at once into `preloadResourcesElement.style.backgroundImage` rather than appending to `preloadResourcesElement.style.backgroundImage` directly each time.
					// Quotation marks are necessary around the `imageURL` (as opposed to omitting them or using apostrophes instead) because `encodeURI` doesn't escape parentheses or apostrophes.
					preloadBackgroundImage += `${preloadBackgroundImage && ', '}url("${encodeURI(imageURL)}")`;
				}
			}

			// The reason we increment `depth` here instead of before the `depth` checks (like on the server) is because it needs to go one extra recursion step in order to fetch the pages one step outside the `PAGE_PRELOAD_DEPTH`.
			depth++;

			// Iterate over each of this page's `nextPages`. This should be done before iterating over previous pages so that images on next pages preload before images on previous pages, since the user is more likely to be flipping forward into unloaded pages than backward.
			for (const nextPageID of pageToCheck.nextPages) {
				checkAdjacentPages(nextPageID, depth);
			}

			const previousPageID = previousPageIDs[pageIDToCheck];
			if (previousPageID === undefined) {
				// If the `previousPageID` is unknown, fetch it.
				unknownPagesNearby = true;
			} else if (previousPageID !== null) {
				// If the `previousPageID` is known and exists, call this function on it.
				checkAdjacentPages(previousPageID, depth);
			}
		};

		checkAdjacentPages(queriedPageID);

		// Update the cache if it changed.
		if (sanitizedPagesChanged as boolean) {
			setSanitizedPages(newSanitizedPages);
		}

		// Update the preloaded images.
		preloadResourcesElement.style.backgroundImage = preloadBackgroundImage;

		if (
			// Only consider fetching new pages around this page if new pages around this page aren't already being fetched.
			!fetchingPageIDsRef.current.includes(queriedPageID)
			&& unknownPagesNearby as boolean
		) {
			fetchingPageIDsRef.current.push(queriedPageID);

			(api as StoryPagesAPI).get(`/stories/${story.id}/pages`, {
				params: {
					...previewMode && {
						preview: '1'
					},
					aroundPageID: queriedPageID.toString(),
					...nearbyCachedPageIDs.length && {
						// Since these pages are the only ones within the `PAGE_PRELOAD_DEPTH` which are already cached on the client, exclude them from the pages to be fetched.
						excludedPageIDs: nearbyCachedPageIDs.join(',')
					}
				}
			}).then(({
				data: {
					pages: newPages,
					previousPageIDs: newPreviousPageIDs
				}
			}) => {
				if (unmounted) {
					return;
				}

				// Ensure this state update will actually cache new pages and won't just create an unnecessary re-render.
				for (const newPageID of Object.keys(newPages)) {
					if (!(newPageID in pagesRef.current)) {
						setPreviousPageIDs(previousPageIDs => ({
							...newPreviousPageIDs,
							// We assign the original `previousPageIDs` after the `newPreviousPageIDs` so that any `previousPageIDs` the client already has set are not overwritten.
							...previousPageIDs
						}));

						setPages(pages => ({
							...pages,
							...newPages
						}));

						break;
					}
				}
			}).finally(() => {
				// Remove this `queriedPageID` from the `fetchingPageIDsRef`.
				fetchingPageIDsRef.current.splice(fetchingPageIDsRef.current.indexOf(queriedPageID), 1);
			});
		}

		return () => {
			unmounted = true;

			// Reset the preloaded images.
			preloadResourcesElement.style.backgroundImage = '';
		};
	}, [queriedPageID, pages, sanitizedPages, previousPageIDs, story.id, previewMode, pagesRef]);

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

	useEffect(() => {
		const onKeyDown = (event: KeyboardEvent) => {
			if (shouldIgnoreControl() || event.ctrlKey || event.altKey || event.metaKey) {
				return;
			}

			const controls = (getUser()?.settings || defaultSettings).controls;

			if (event.code === controls.previousPage) {
				if (previousPageID) {
					goToPage(previousPageID);
				}

				event.preventDefault();
				return;
			}

			if (event.code === controls.nextPage) {
				goToNextPage();

				event.preventDefault();
			}
		};

		document.addEventListener('keydown', onKeyDown);

		return () => {
			document.removeEventListener('keydown', onKeyDown);
		};
	}, [goToNextPage, page, previousPageID, pages]);

	/** Whether the "Go Back" link should be shown. */
	const showGoBack = !(
		previousPageID === null
		|| previousPageID === undefined
	);

	return (
		<Page
			basement={(
				<Basement
					story={story}
					pageID={pageID}
					previewMode={previewMode}
					{...props}
				/>
			)}
		>
			<div className="story-page-container">
				<div
					className="story-page front"
					ref={storyPageElementRef}
				>
					<Fragment
						// This key is here to force the inner DOM to reset between different pages.
						key={pageID}
					>
						{sanitizedPage?.title && (
							<div className="story-page-title">
								<BBCode alreadySanitized>
									{sanitizedPage.title}
								</BBCode>
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
									{sanitizedPage!.content}
								</BBCode>
							)}
						</div>
						<div className="story-page-links">
							{page?.nextPages.map((nextPageID, i) => {
								const sanitizedNextPage = sanitizedPages[nextPageID];

								// Only render this link if its sanitized page is loaded.
								return (
									<Fragment key={i}>
										{sanitizedNextPage && (
											<div className="story-page-link-container">
												<Link
													shallow
													href={`/?s=${story.id}&p=${nextPageID}${previewMode ? '&preview=1' : ''}`}
													data-index={i}
													onClick={onClickNextPageLink}
												>
													<BBCode alreadySanitized>
														{sanitizedNextPage.title}
													</BBCode>
												</Link>
											</div>
										)}
									</Fragment>
								);
							})}
						</div>
					</Fragment>
					<div className="story-page-footer">
						{(
							// Only render the group if any of its children would be rendered.
							pageID !== 1 || showGoBack
						) && (
							<>
								<span className="story-page-footer-group">
									<Delimit with={<Stick />}>
										{pageID !== 1 && (
											<Link
												id="link-start-over"
												shallow
												href={`/?s=${story.id}&p=1${previewMode ? '&preview=1' : ''}`}
											>
												Start Over
											</Link>
										)}
										{showGoBack && (
											<Link
												id="link-go-back"
												shallow
												href={`/?s=${story.id}&p=${previousPageID}${previewMode ? '&preview=1' : ''}`}
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
							<Link id="link-save-game">
								Save Game
							</Link>
							{' '}
							<Link id="link-save-game-help" onClick={openSaveGameHelp}>
								(?)
							</Link>
							<Stick />
							<Link id="link-load-game">
								Load Game
							</Link>
							<Stick />
							<Link id="link-delete-game">
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