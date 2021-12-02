import './styles.module.scss';
import Page from 'components/Page';
import type { ClientStoryPage, PublicStory, StoryLogListings } from 'lib/client/stories';
import Link from 'components/Link';
import Router, { useRouter } from 'next/router';
import type { Dispatch, SetStateAction } from 'react';
import React, { useState, useEffect, useRef, Fragment, useMemo } from 'react';
import type { StoryPageID } from 'lib/server/stories';
import BBCode from 'components/BBCode';
import useIsomorphicLayoutEffect from 'lib/client/reactHooks/useIsomorphicLayoutEffect';
import useLatest from 'lib/client/reactHooks/useLatest';
import Stick from 'components/Stick';
import Delimit from 'components/Delimit';
import Dialog from 'lib/client/Dialog';
import { getUser } from 'lib/client/reactContexts/UserContext';
import shouldIgnoreControl from 'lib/client/shouldIgnoreControl';
import type { APIClient, APIConfig } from 'lib/client/api';
import api from 'lib/client/api';
import type { ClientNewsPost } from 'lib/client/news';
import Basement from 'components/StoryViewer/Basement';
import PreviewModeContext from 'lib/client/reactContexts/PreviewModeContext';
import StoryPageLink from 'components/StoryPageLink';
import StoryIDContext from 'lib/client/reactContexts/StoryIDContext';
import useFunction from 'lib/client/reactHooks/useFunction';
import promptSignIn from 'lib/client/promptSignIn';
import defaultUserSettings from 'lib/client/defaultUserSettings';
import parseBBCode from 'lib/client/parseBBCode';
import type { ParsedReactNode } from 'lib/client/parseBBCode/BBStringParser';
import BBTags from 'components/BBCode/BBTags';

type StoryPagesAPI = APIClient<typeof import('pages/api/stories/[storyID]/pages').default>;
type UserStorySaveAPI = APIClient<typeof import('pages/api/users/[userID]/storySaves/[storyID]').default>;

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

const saveGameHelp = () => {
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

export type StoryViewerProps = {
	story: PublicStory,
	/**
	 * The cached pages.
	 *
	 * If a page ID maps to `null`, then the page does not exist to the client, letting the client know not to try to request it.
	 */
	pages: Partial<Record<StoryPageID, ClientStoryPage | null>>,
	previousPageIDs: ClientPreviousPageIDs,
	latestPages: StoryLogListings,
	newsPosts: ClientNewsPost[],
	hasCommentary: boolean
};

/** A React context of the initial `StoryViewerProps`. */
export const StoryViewerContext = React.createContext<StoryViewerProps | undefined>(undefined);
/** A React context for the ID of the loaded page currently being viewed in the `StoryViewer`, or `null` if the page doesn't exist. */
export const PageIDContext = React.createContext<StoryPageID | null>(null);
export const CommentaryShownContext = React.createContext<[
	commentaryShown: boolean,
	setCommentaryShown: Dispatch<SetStateAction<boolean>>
] | undefined>(undefined);

/** The `Page` on which a story can be viewed. */
const StoryViewer = (props: StoryViewerProps) => {
	const {
		story,
		pages: initialPages,
		previousPageIDs: initialPreviousPageIDs
	} = props;

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
	/** The ID of the current page of the story being viewed. Can reference a page that doesn't exist, but cannot reference a page that hasn't finished loading. */
	const pageID = (
		queriedPageID in pages
			// Only change the `pageID` to the new `queriedPageID` if the page it references has finished loading and is now cached.
			? queriedPageID
			// Otherwise keep the same value as the last render (which necessarily has finished loading).
			: pageIDRef.current
	);
	const page = pages[pageID] as ClientStoryPage | null;

	const previousPageIDsRef = useRef<ClientPreviousPageIDs>(initialPreviousPageIDs);

	// Check if this page is one of the previous page's `nextPages`.
	if (pages[pageIDRef.current]?.nextPages.includes(pageID)) {
		// The user navigated from the previous page to this page, so from now on, when the user clicks "Go Back" on this page, it should take them back to that same previous page, as opposed to a different page that also has this one in its `nextPages` but isn't the page that the user came from.
		previousPageIDsRef.current[pageID] = pageIDRef.current;
	}

	/** The page ID to take the user to when clicking the "Go Back" link. Unless nullable, necessarily indexes a cached page. */
	const previousPageID = previousPageIDsRef.current[pageID];

	pageIDRef.current = pageID;

	/** A ref to an array of page IDs which are currently being fetched around. */
	const fetchingPageIDsRef = useRef<StoryPageID[]>([]);

	// Fetch and cache new pages, and preload their images.
	// None of this should be done server-side, because caching or preloading anything server-side would be pointless since it wouldn't be sent to the client.
	useEffect(() => {
		let unmounted = false;

		/** Whether any pages need to be fetched from the server if they aren't already being fetched. */
		let unknownPagesNearby = false;
		/** All page IDs within the `PAGE_PRELOAD_DEPTH` which should not be fetched since the client already has them. */
		const nearbyCachedPageIDs: StoryPageID[] = [];

		const dummyElement = document.getElementById('dummy') as HTMLDivElement;
		// Reset the preloaded images.
		/** The string to be set into `dummyElement.style.backgroundImage` to preload images. */
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

			// If this page is within the `IMAGE_PRELOAD_DEPTH`, preload its images.
			if (depth <= IMAGE_PRELOAD_DEPTH) {
				/** A function called recursively on every `ParsedReactNode` in `pageToCheck`'s `title` and `content`. */
				const lookForImages = (node: ParsedReactNode) => {
					if (typeof node === 'string') {
						return;
					}

					if (Array.isArray(node)) {
						node.forEach(lookForImages);

						return;
					}

					// If this point is reached, `node` is a `JSX.Element`.

					if (
						node.type === BBTags.img!
						&& typeof node.props.children === 'string'
					) {
						// Add this image to the preloaded images.
						// To improve performance, we append to a string to be set all at once into `dummyElement.style.backgroundImage` rather than appending to `dummyElement.style.backgroundImage` directly each time.
						preloadBackgroundImage += (
							(preloadBackgroundImage && ', ')
							// Quotation marks are necessary around the image URL (as opposed to omitting them or using apostrophes instead) because `encodeURI` doesn't escape parentheses or apostrophes.
							+ `url("${encodeURI(node.props.children)}")`
						);

						return;
					}

					lookForImages(node.props.children);
				};

				lookForImages([
					parseBBCode(pageToCheck.title, { keepHTMLTags: true }),
					parseBBCode(pageToCheck.content, { keepHTMLTags: true })
				]);
			}

			// The reason we increment `depth` here instead of before the `depth` checks (like on the server) is because it needs to go one extra recursion step in order to fetch the pages one step outside the `PAGE_PRELOAD_DEPTH`.
			depth++;

			// Iterate over each of this page's `nextPages`. This should be done before iterating over previous pages so that images on next pages preload before images on previous pages, since the user is more likely to be flipping forward into unloaded pages than backward.
			for (const nextPageID of pageToCheck.nextPages) {
				checkAdjacentPages(nextPageID, depth);
			}

			const previousPageID = previousPageIDsRef.current[pageIDToCheck];
			if (previousPageID === undefined) {
				// If the `previousPageID` is unknown, fetch it.
				unknownPagesNearby = true;
			} else if (previousPageID !== null) {
				// If the `previousPageID` is known and exists, call this function on it.
				checkAdjacentPages(previousPageID, depth);
			}
		};

		checkAdjacentPages(queriedPageID);

		// Update the preloaded images.
		dummyElement.style.backgroundImage = preloadBackgroundImage;

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

				for (const newPageID of Object.keys(newPages)) {
					// Ensure this state update will actually cache a new page and won't just create an unnecessary re-render.
					if (!(newPageID in pagesRef.current)) {
						// Update the `previousPageIDsRef` with the `newPreviousPageIDs`.
						for (const newPreviousPageIDKey of Object.keys(newPreviousPageIDs)) {
							const newPreviousPageIDKeyNumber = +newPreviousPageIDKey;

							// Ensure none of the client's original `previousPageIDs` are overwritten by any of the `newPreviousPageIDs`.
							if (!(newPreviousPageIDKey in previousPageIDsRef.current)) {
								previousPageIDsRef.current[newPreviousPageIDKeyNumber] = newPreviousPageIDs[newPreviousPageIDKeyNumber];
							}
						}

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
			dummyElement.style.backgroundImage = '';
		};
	}, [queriedPageID, pages, story.id, previewMode, pagesRef]);

	const storySectionElementRef = useRef<HTMLDivElement>(null!);

	// Add the `panel` class to any media elements large enough to be considered a panel.
	// This is a layout effect rather than a normal effect so that media is not briefly visible at the wrong size.
	useIsomorphicLayoutEffect(() => {
		const storySectionElementStyle = window.getComputedStyle(storySectionElementRef.current);

		/** The content width of the story section. */
		const storySectionContentWidth = (
			+storySectionElementStyle.minWidth.slice(0, -2)
			- +storySectionElementStyle.paddingLeft.slice(0, -2)
			- +storySectionElementStyle.paddingRight.slice(0, -2)
		);

		/** Adds or removes the `panel` class to an inputted element based on its size relative to the story section. */
		const classifyPotentialPanel = (element: HTMLElement) => {
			element.classList[
				element.getBoundingClientRect().width > storySectionContentWidth
					// If and only if the element is wider than the content width of the story section, this element should have the `panel` class.
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
			for (const element of storySectionElementRef.current.getElementsByTagName(tagName)) {
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

			const controls = (getUser()?.settings || defaultUserSettings).controls;

			if (event.code === controls.previousPage) {
				if (previousPageID) {
					goToPage(previousPageID);
				}

				event.preventDefault();
				return;
			}

			if (event.code === controls.nextPage) {
				const nextPageID = page?.nextPages[0];

				// If the `nextPageID` exists is cached in `pages`, then go to it.
				if (nextPageID && pages[nextPageID]) {
					goToPage(nextPageID);
				}

				event.preventDefault();
			}
		};

		document.addEventListener('keydown', onKeyDown);

		return () => {
			document.removeEventListener('keydown', onKeyDown);
		};
	}, [page, previousPageID, pages]);

	/** Whether the "Go Back" link should be shown. */
	const showGoBack = !!previousPageID;

	const [commentaryShown, setCommentaryShown] = useState(false);

	const pageComponent = (
		<Page basement={<Basement />}>
			<div id="story-page" className="story-section-container">
				<div
					className="story-section front"
					ref={storySectionElementRef}
				>
					<Fragment
						// This key is here to force the inner DOM to reset between different pages.
						key={pageID}
					>
						{page && (
							<div className="story-section-title">
								<BBCode keepHTMLTags>
									{page.title}
								</BBCode>
							</div>
						)}
						<div className="story-section-content">
							{page === null ? (
								story.pageCount ? (
									// This page does not exist.
									<>This page does not exist.</>
								) : (
									// This story has no pages.
									<>This adventure has no pages.</>
								)
							) : (
								// This page is loaded.
								<BBCode keepHTMLTags>
									{page.content}
								</BBCode>
							)}
						</div>
						<div className="story-section-links">
							{page?.nextPages.map((nextPageID, i) => {
								const nextPage = pages[nextPageID];

								// Only render this link if the page it links to is loaded.
								return (
									<Fragment key={i}>
										{nextPage && (
											<div className="story-section-link-container">
												<StoryPageLink
													className="story-section-link"
													pageID={nextPageID}
												>
													<BBCode keepHTMLTags>
														{nextPage.title}
													</BBCode>
												</StoryPageLink>
											</div>
										)}
									</Fragment>
								);
							})}
						</div>
					</Fragment>
					<div className="story-section-footer">
						{(
							// Only render the group if any of its children would be rendered.
							pageID !== 1 || showGoBack
						) && (
							<>
								<span className="story-section-footer-group">
									<Delimit with={<Stick />}>
										{pageID !== 1 && (
											<StoryPageLink
												className="story-link-start-over"
												pageID={1}
											>
												Start Over
											</StoryPageLink>
										)}
										{showGoBack && (
											<StoryPageLink
												className="story-link-go-back"
												pageID={previousPageID}
											>
												Go Back
											</StoryPageLink>
										)}
									</Delimit>
								</span>
								<span className="story-section-footer-group-delimiter" />
							</>
						)}
						<span className="story-section-footer-group">
							<Link
								className="story-link-save-game"
								onClick={
									useFunction(async () => {
										if (!page) {
											new Dialog({
												id: 'story-saves',
												title: 'Save Game',
												content: 'The page you\'re on does not exist and can\'t be saved.'
											});
											return;
										}

										const user = getUser();

										if (!user) {
											if (await Dialog.confirm({
												id: 'story-saves',
												title: 'Save Game',
												content: 'Sign into the account you want to save to!',
												actions: ['Sign In', 'Cancel']
											})) {
												promptSignIn();
											}

											return;
										}

										(api as UserStorySaveAPI).put(`/users/${user.id}/storySaves/${story.id}`, pageID);
									})
								}
							>
								Save Game
							</Link>
							{' '}
							<Link className="story-link-save-game-help" onClick={saveGameHelp}>
								(?)
							</Link>
							<Stick />
							<Link
								className="story-link-load-game"
								onClick={
									useFunction(async () => {
										const user = getUser();

										if (!user) {
											if (await Dialog.confirm({
												id: 'story-saves',
												title: 'Load Game',
												content: 'Sign in to load your save!',
												actions: ['Sign In', 'Cancel']
											})) {
												promptSignIn();
											}

											return;
										}

										const { data: savedPageID } = await (api as UserStorySaveAPI).get(`/users/${user.id}/storySaves/${story.id}`, {
											beforeInterceptError: error => {
												if (error.response?.status === 404) {
													error.preventDefault();

													new Dialog({
														id: 'story-saves',
														title: 'Load Game',
														content: 'You have no save for this adventure!'
													});
												}
											}
										});

										goToPage(savedPageID);
									})
								}
							>
								Load Game
							</Link>
							<Stick />
							<Link
								className="story-link-delete-game"
								onClick={
									useFunction(async () => {
										const user = getUser();

										if (!user) {
											if (await Dialog.confirm({
												id: 'story-saves',
												title: 'Delete Game Data',
												content: 'Sign in to delete your save!',
												actions: ['Sign In', 'Cancel']
											})) {
												promptSignIn();
											}

											return;
										}

										const deleteUserStorySaveAPIConfig: APIConfig = {
											beforeInterceptError: error => {
												if (error.response?.status === 404) {
													error.preventDefault();

													new Dialog({
														id: 'story-saves',
														title: 'Delete Game Data',
														content: 'You have no save for this adventure!'
													});
												}
											}
										};

										await (api as UserStorySaveAPI).get(`/users/${user.id}/storySaves/${story.id}`, deleteUserStorySaveAPIConfig);

										if (!await Dialog.confirm({
											id: 'story-saves',
											title: 'Delete Game Data',
											content: 'Are you sure you want to delete your save for this adventure?'
										})) {
											return;
										}

										(api as UserStorySaveAPI).delete(`/users/${user.id}/storySaves/${story.id}`, deleteUserStorySaveAPIConfig);
									})
								}
							>
								Delete Game Data
							</Link>
						</span>
					</div>
				</div>
			</div>
			{commentaryShown && page?.commentary && (
				<div id="story-commentary" className="story-section-container">
					<div className="story-section front">
						<div className="story-section-content">
							<BBCode keepHTMLTags>
								{page.commentary}
							</BBCode>
						</div>
					</div>
				</div>
			)}
		</Page>
	);

	return (
		<StoryIDContext.Provider value={story.id}>
			<PreviewModeContext.Provider value={previewMode}>
				<StoryViewerContext.Provider value={props}>
					<PageIDContext.Provider value={page && pageID}>
						<CommentaryShownContext.Provider
							value={
								useMemo(
									() => [commentaryShown, setCommentaryShown],
									[commentaryShown, setCommentaryShown]
								)
							}
						>
							{pageComponent}
						</CommentaryShownContext.Provider>
					</PageIDContext.Provider>
				</StoryViewerContext.Provider>
			</PreviewModeContext.Provider>
		</StoryIDContext.Provider>
	);
};

export default StoryViewer;