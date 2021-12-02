import './styles.module.scss';
import Page from 'components/Page';
import type { FormikProps } from 'formik';
import { Form, Formik } from 'formik';
import type { Dispatch, MouseEvent, MutableRefObject, ReactNode, SetStateAction } from 'react';
import React, { useRef, useState, useEffect, useMemo } from 'react';
import useFunction from 'lib/client/reactHooks/useFunction';
import { getChangedValues, preventLeaveConfirmations, useLeaveConfirmation } from 'lib/client/forms';
import type { StoryID, StoryPageID } from 'lib/server/stories';
import type { ClientStoryPage, ClientStoryPageRecord, PrivateStory } from 'lib/client/stories';
import Section from 'components/Section';
import type { APIClient } from 'lib/client/api';
import api from 'lib/client/api';
import StoryEditorPageListing from 'components/StoryEditor/StoryEditorPageList/StoryEditorPageListing';
import useIsomorphicLayoutEffect from 'lib/client/reactHooks/useIsomorphicLayoutEffect';
import useLatest from 'lib/client/reactHooks/useLatest';
import Router, { useRouter } from 'next/router';
import frameThrottler from 'lib/client/frameThrottler';
import { addViewportListener, removeViewportListener } from 'lib/client/viewportListener';
import type { integer } from 'lib/types';
import useSticky from 'lib/client/reactHooks/useSticky';
import StoryIDContext from 'lib/client/reactContexts/StoryIDContext';
import StoryEditorPageGrid, { defaultGridCullingInfo } from 'components/StoryEditor/StoryEditorPageGrid';
import StoryEditorPageList from 'components/StoryEditor/StoryEditorPageList';
import StoryEditorPagesOptions from 'components/StoryEditor/StoryEditorPagesOptions';
import useSubmitOnSave from 'lib/client/reactHooks/useSubmitOnSave';
import PrivateStoryContext from 'lib/client/reactContexts/PrivateStoryContext';

type StoryPagesAPI = APIClient<typeof import('pages/api/stories/[storyID]/pages').default>;

const getScrollPaddingTop = () => +document.documentElement.style.scrollPaddingTop.slice(0, -2);

export type Values = {
	/** An object mapping page IDs to their corresponding pages. Since this object has numeric keys, standard JavaScript automatically sorts its properties by lowest first. */
	pages: ClientStoryPageRecord
};

/**
 * The symbol used to index a `ClientStoryPage`'s React key.
 *
 * This must be a symbol rather than a string so it is not detected when diffing pages for unsaved changes, but it is still kept when creating a shallow clone of the page.
 */
export const _key = Symbol('key');

/** A `ClientStoryPage` with a React key. */
export type KeyedClientStoryPage = ClientStoryPage & {
	/** This page's React key. */
	[_key]: integer
};

export const StoryEditorContext = React.createContext<{
	storyID: StoryID,
	firstDraftID: StoryPageID | undefined,
	lastNonDraftID: StoryPageID | undefined,
	formikPropsRef: MutableRefObject<FormikProps<Values>>,
	setInitialPages: Dispatch<SetStateAction<ClientStoryPageRecord>>,
	queuedValuesRef: MutableRefObject<Values | undefined>,
	isSubmitting: boolean,
	cachedPageHeightsRef: MutableRefObject<Partial<Record<StoryPageID, number>>>,
	toggleAdvancedShown: (pageKey: integer) => void
} | undefined>(undefined);

const calculateGridSizeInfo = (
	formikPropsRef: MutableRefObject<FormikProps<Values>>,
	pageElement: HTMLDivElement
) => {
	const pageContainer = document.getElementById('story-editor-pages')!;
	const pageContainerRect = pageContainer.getBoundingClientRect();
	const pageContainerStyle = window.getComputedStyle(pageContainer);
	// We use `getComputedStyle` to get the width rather than `getBoundingClientRect` because the former gets exclusively the content size (assuming `pageContainerStyle.boxSizing === 'content-box'`, which is default) while the latter does not.
	const pageContainerWidth = +pageContainerStyle.width.slice(0, -2);

	const pageRect = pageElement.getBoundingClientRect();
	const pageStyle = window.getComputedStyle(pageElement);
	const pageWidth = (
		pageRect.width
		+ +pageStyle.marginLeft.slice(0, -2)
		+ +pageStyle.marginRight.slice(0, -2)
	);
	const pageHeight = (
		pageRect.height
		+ +pageStyle.marginTop.slice(0, -2)
		+ +pageStyle.marginBottom.slice(0, -2)
	);

	const pagesPerRow = Math.floor(pageContainerWidth / pageWidth);

	const pageCount = Object.values(formikPropsRef.current.values.pages).length;
	const rowCount = Math.ceil(pageCount / pagesPerRow);

	/** The number of pixels in `pageContainer`'s potential height which is above the top of the view. */
	const pixelsAboveView = Math.max(0, -pageContainerRect.top);
	/** The number of pixels in `pageContainer`'s potential height which is within view. */
	const pixelsInView = (
		pageContainerRect.top < 0
			? document.documentElement.clientHeight
			: pageContainerRect.top > document.documentElement.clientHeight
				? 0
				: document.documentElement.clientHeight - pageContainerRect.top
	);

	const rowsAboveView = Math.min(
		Math.floor(pixelsAboveView / pageHeight),
		rowCount
	);
	const rowsInView = Math.min(
		// The `+ 1` is not always necessary, but often it is, and it doesn't hurt when it isn't.
		Math.ceil(pixelsInView / pageHeight) + 1,
		rowCount - rowsAboveView
	);
	const rowsBelowView = rowCount - rowsInView - rowsAboveView;

	const pagesAboveView = Math.min(
		rowsAboveView * pagesPerRow,
		pageCount
	);
	const pagesInView = Math.min(
		rowsInView * pagesPerRow,
		pageCount - pagesAboveView
	);

	return { pageContainer, pageHeight, pagesPerRow, pageCount, rowsAboveView, rowsBelowView, pagesAboveView, pagesInView };
};

export type StoryEditorProps = {
	story: PrivateStory,
	pages: ClientStoryPageRecord
};

/** The `Page` on which a story's pages can be edited. */
const StoryEditor = ({
	story: initialStory,
	pages: initialPagesProp
}: StoryEditorProps) => {
	const [story, setStory] = useState(initialStory);
	const [initialPages, setInitialPages] = useState(initialPagesProp);

	const formikPropsRef = useRef<FormikProps<Values>>(null!);

	const pageComponent = (
		<Page heading="Edit Adventure">
			<Formik<Values>
				initialValues={{
					pages: initialPages
				}}
				onSubmit={
					useFunction(async values => {
						const changedValues = getChangedValues(initialPages, values.pages);

						if (!changedValues) {
							return;
						}

						const { data: newInitialPages } = await (api as StoryPagesAPI).patch(`/stories/${story.id}/pages`, changedValues as any);

						// Preserve the React keys of updated pages.
						for (const newInitialPage of Object.values(newInitialPages)) {
							(newInitialPage as KeyedClientStoryPage)[_key] = (
								formikPropsRef.current.values.pages[newInitialPage.id] as KeyedClientStoryPage
							)[_key];
						}

						setInitialPages({
							...initialPages,
							...newInitialPages
						});
					})
				}
				// Even though we have no `validate` function, these three props are necessary to set as a significant performance optimization.
				validateOnChange={false}
				validateOnBlur={false}
				validateOnMount={false}
				enableReinitialize
			>
				{function StoryEditorPageForm(formikProps) {
					// Using this instead of destructuring the Formik props directly is necessary as a performance optimization, to significantly reduce unnecessary re-renders.
					formikPropsRef.current = formikProps;

					useLeaveConfirmation(formikPropsRef.current.dirty || formikPropsRef.current.isSubmitting);

					const router = useRouter();

					const [viewMode, setViewMode] = useState(
						router.query.view === 'grid'
							? 'grid' as const
							// Default to `'list'` for invalid query params.
							: 'list' as const
					);
					const [sortMode, setSortMode] = useState(
						router.query.sort === 'oldest'
							? 'oldest' as const
							// Default to `'newest'` for invalid query params.
							: 'newest' as const
					);

					/**
					 * Anything set to this ref should be set as the Formik values once before rendering.
					 *
					 * Values must be queued instead of set immediately whenever this form's initial values are changed, since doing so resets the values due to the `enableReinitialization` prop on the `Formik` component.
					*/
					const queuedValuesRef = useRef<Values>();

					// Set the values queued in `queuedValuesRef`.
					useIsomorphicLayoutEffect(() => {
						if (queuedValuesRef.current) {
							formikPropsRef.current.setValues(queuedValuesRef.current);

							queuedValuesRef.current = undefined;
						}
					});

					const pageValues = Object.values(formikPropsRef.current.values.pages);

					// This state is an array of page tiles which are selected.
					const [selectedPages, setSelectedPages] = useState<StoryPageID[]>([]);

					const lastActivePageIDRef = useRef<StoryPageID>(1);

					// Deselect any selected pages which were deleted.
					for (let i = 0; i < selectedPages.length; i++) {
						// Check if this page's ID is greater than the number of pages, meaning the page was deleted.
						if (selectedPages[i] > pageValues.length) {
							selectedPages.splice(i, 1);

							// Since this iteration's item was removed from the array, redo this iteration.
							i--;
						}
					}

					// Ensure the `lastActivePageIDRef` is not set to a deleted page.
					if (lastActivePageIDRef.current > pageValues.length) {
						lastActivePageIDRef.current = pageValues.length;
					}

					// This state is an array of the keys of pages whose advanced section is toggled open.
					const [advancedShownPageKeys, setAdvancedShownPageKeys] = useState<integer[]>([]);

					const onClickPageTile = useFunction((event: MouseEvent<HTMLDivElement> & { target: HTMLDivElement }) => {
						const pageID = +event.target.id.slice(1);

						const newSelectedPages = [...selectedPages];

						if (event.shiftKey) {
							const startID = Math.min(lastActivePageIDRef.current, pageID);
							const endID = Math.max(lastActivePageIDRef.current, pageID);

							// If the user is not holding `ctrl` or `⌘`, deselect all pages outside the target range.
							if (!(event.ctrlKey || event.metaKey)) {
								newSelectedPages.length = 0;
							}

							// Select all the pages in the range between `lastActivePageIDRef.current` and `pageID` (inclusive).
							for (let i = startID; i <= endID; i++) {
								newSelectedPages.push(i);
							}
						} else {
							// Toggle whether this page is selected.

							const pageIndex = newSelectedPages.indexOf(pageID);
							if (pageIndex === -1) {
								newSelectedPages.push(pageID);
							} else {
								newSelectedPages.splice(pageIndex, 1);
							}

							lastActivePageIDRef.current = pageID;
						}

						setSelectedPages(newSelectedPages);
					});

					// When `viewMode === 'list'`, this state is a record that maps page IDs to a boolean of their `culled` prop, or to undefined if the page hasn't been processed by `updateCulledPages` yet.
					const [culledPages, setCulledPages] = useState<Partial<Record<StoryPageID, boolean>>>({});
					// This ref is to prevent unnecessary updates to the effect hook which calls `updateCulledPages`.
					const culledPagesRef = useLatest(culledPages);

					// This state is the default height of a culled page element when `viewMode === 'list'`.
					const [defaultCulledHeight, setDefaultCulledHeight] = useState(
						// An arbitrary default culled page element height. Shouldn't be too small, or else unnecessary re-renders may occur initially due to a higher chance of more page elements being temporarily in view for a short time.
						400
					);
					/** A ref to the latest value of `defaultCulledHeight` to avoid race conditions. */
					const defaultCulledHeightRef = useLatest(defaultCulledHeight);
					/** A ref to whether `defaultCulledHeight` has still not been set. */
					const defaultCulledHeightUnsetRef = useRef(true);

					/** A ref to a partial record that maps each page's key to its cached height when `viewMode === 'list'`. */
					const cachedPageHeightsRef = useRef<Partial<Record<integer, number>>>({});
					// Keys are used instead of page IDs so that cached heights are preserved correctly when pages are deleted or rearranged.

					// This state is some information useful for culling when `viewMode === 'grid'`.
					const [gridCullingInfo, setGridCullingInfo] = useState({ ...defaultGridCullingInfo });
					const gridCullingInfoRef = useLatest(gridCullingInfo);

					// Ensure the `gridCullingInfo` indexes are within the range of existing pages in case pages were deleted but `gridCullingInfo` has not been updated yet.
					if (
						// If there aren't any pages, then `gridCullingInfo` cannot possibly refer to valid pages, so invalid `gridCullingInfo` only matters if there are any pages.
						pageValues.length
						// If the `firstIndex` is out of range, then the `lastIndex` is out of range, so it is only necessary to check the `lastIndex`.
						&& gridCullingInfo.lastIndex >= pageValues.length
					) {
						// If the `gridCullingInfo` is invalid, reset it to the default.
						Object.assign(gridCullingInfo, defaultGridCullingInfo);
					}

					/** A ref to whether `updateLocationHash` has been called yet and shouldn't be called again without a `hashchange` event. */
					const calledUpdateLocationHashRef = useRef(false);

					useEffect(() => {
						const url = new URL(location.href);

						// Update the URL's query params.
						url.searchParams.set('view', viewMode);
						url.searchParams.set('sort', sortMode);

						if (calledUpdateLocationHashRef.current) {
							// If the location hash has already been used, remove it so the browser doesn't try to scroll each time `view` or `sort` changes.
							url.hash = '';
						}

						// Check if this URL replacement will trigger a route change. Ignore differences in hashes since those don't trigger route changes.
						if (url.href.replace(/#.*$/, '') !== location.href.replace(/#.*$/, '')) {
							preventLeaveConfirmations();
						}

						// This is `replace`d and not `push`ed because `push`ing would allow using history navigation to change the `viewMode` while `dirty` or `isSubmitting`, which is disallowed.
						Router.replace(url, undefined, { shallow: true });

						const updateLocationHash = () => {
							if (/^#p\d+$/.test(location.hash)) {
								const pageID = +location.hash.slice(2);

								const lastPageID = Object.values(formikPropsRef.current.values.pages).length;

								// Check if the target is a real page.
								if (
									pageID > 0
									&& pageID <= lastPageID
								) {
									// Jump to where the target page is if it isn't culled, or where it would be if it weren't culled.

									// We can assert this is non-nullable because we have verified in that the target page exists, and if a page exists, then at least one page element (though not necessarily the one we're jumping to) must be mounted.
									const firstPageElement = document.getElementsByClassName('story-editor-page')[0] as HTMLDivElement;

									if (viewMode === 'list') {
										let offsetTop = firstPageElement.offsetTop;

										const iteratePage = (pageID: StoryPageID) => {
											const pageHeight = cachedPageHeightsRef.current[
												// This page's key.
												(formikPropsRef.current.values.pages[pageID] as KeyedClientStoryPage)[_key]
											] ?? defaultCulledHeightRef.current;

											// Add this page's height to the `offsetTop`.
											offsetTop += pageHeight;
										};

										if (sortMode === 'oldest') {
											for (let i = 1; i < pageID; i++) {
												iteratePage(i);
											}
										} else {
											for (let i = lastPageID; i > pageID; i--) {
												iteratePage(i);
											}
										}

										document.documentElement.scrollTop = offsetTop - getScrollPaddingTop();
									} else {
										// If this point is reached, `viewMode === 'grid'`.

										const {
											pageContainer,
											pageHeight,
											pagesPerRow
										} = calculateGridSizeInfo(formikPropsRef, firstPageElement);

										/** The index of the row which the target page is on. */
										const pageRow = Math.floor(
											(
												sortMode === 'oldest'
													? pageID - 1
													: lastPageID - pageID
											) / pagesPerRow
										);

										document.documentElement.scrollTop = pageContainer.offsetTop + pageRow * pageHeight - getScrollPaddingTop();
									}
								}
							}
						};

						window.addEventListener('hashchange', updateLocationHash);

						if (!calledUpdateLocationHashRef.current) {
							// This timeout is necessary to wait for the browser to jump to the initial location hash first so that `updateLocationHash` can run afterward uninterrupted, and also so `updateCulledPages` can update `defaultCulledHeight`.
							setTimeout(updateLocationHash);

							calledUpdateLocationHashRef.current = true;
						}

						return () => {
							window.removeEventListener('hashchange', updateLocationHash);
						};
					}, [viewMode, sortMode, gridCullingInfoRef, defaultCulledHeightRef]);

					// This is a layout effect rather than a normal effect to reduce the time the user can briefly see culled pages.
					useIsomorphicLayoutEffect(() => {
						const updateCulledPages = () => {
							const pageElements = document.getElementsByClassName('story-editor-page') as HTMLCollectionOf<HTMLDivElement>;

							if (viewMode === 'list') {
								const lastPageID = Object.values(formikPropsRef.current.values.pages).length;

								let culledPagesChanged = false;
								const newCulledPages: Record<StoryPageID, boolean> = {};

								if (lastPageID) {
									// The first page and the last page should not be culled so that they can be tabbed into, even if they are outside of view.
									newCulledPages[1] = false;
									// Additionally, the last page must also not be unculled so that it can receive the `style.marginTop` to hold the place of any culled pages at the bottom.
									newCulledPages[lastPageID] = false;

									let activeElementAncestor: Node | null = document.activeElement;

									// Find the ancestor of `document.activeElement` which is a page listing.
									while (activeElementAncestor instanceof Element) {
										if (activeElementAncestor.classList.contains('story-editor-page')) {
											// If `activeElementAncestor.id === 'p14'` for example, then `pageID === 14`.
											const pageID = +activeElementAncestor.id.slice(1);

											// The page listing which has focus should not be culled, or else it would lose focus, causing inconvenience to the user.
											newCulledPages[pageID] = false;
											// The pages before and after a focused page should also not be culled, so that they can be tabbed into.
											if (pageID > 1) {
												newCulledPages[pageID - 1] = false;
											}
											if (pageID < lastPageID) {
												newCulledPages[pageID + 1] = false;
											}

											break;
										}

										activeElementAncestor = activeElementAncestor.parentNode;
									}

									// Store this computed value beforehand for performance.
									const viewportHeight = document.documentElement.clientHeight;

									for (let i = 0; i < pageElements.length; i++) {
										const pageElement = pageElements[i];

										const pageID = +pageElement.id.slice(1);

										// `getBoundingClientRect()` is significantly faster than `offsetTop` and `offsetHeight`.
										const pageRect = pageElement.getBoundingClientRect();

										const pageHeight = (
											pageRect.height
											+ +window.getComputedStyle(pageElement).marginBottom.slice(0, -2)
										);

										// Cache this page's height. This should be done here and not in the `StoryEditorPageListing` component so it can be ensured that it is up-to-date.
										cachedPageHeightsRef.current[
											// This page's key.
											(formikPropsRef.current.values.pages[pageID] as KeyedClientStoryPage)[_key]
										] = pageHeight;

										if (defaultCulledHeightUnsetRef.current) {
											// If no default culled page element height has been set yet, set it to this page element's height.
											// Using an arbitrary page listing's height as the default is a sufficient solution for scroll jitter in the vast majority of cases.

											setDefaultCulledHeight(pageHeight);
											defaultCulledHeightUnsetRef.current = false;
										}

										// If whether this iteration's page should be culled has already been determined, skip this iteration.
										if (pageID in newCulledPages) {
											continue;
										}

										// Page elements containing invalid form elements should not be culled so those invalid elements can be detected and focused when the user attempts to submit.
										// Page elements containing open BB tools should also not be culled so submitting the BB tool's dialog is able to add the BBCode to the mounted BB field.
										if (pageElement.querySelector(':invalid, .bb-tool.open')) {
											newCulledPages[pageID] = false;
										}
									}

									const scrollTop = document.documentElement.scrollTop;
									let offsetTop = pageElements[0].offsetTop;

									const iteratePage = (pageID: StoryPageID) => {
										const pageHeight = cachedPageHeightsRef.current[
											// This page's key.
											(formikPropsRef.current.values.pages[pageID] as KeyedClientStoryPage)[_key]
										] ?? defaultCulledHeight;

										// Only calculate whether this page should be culled if it hasn't already been determined previously.
										if (!(pageID in newCulledPages)) {
											newCulledPages[pageID] = !(
												// Whether this page is expected to be in view.
												(
													// Whether the bottom of this page would be below the top of the view.
													offsetTop + pageHeight > scrollTop
													// Whether the top of this page would be above the bottom of the view.
													&& offsetTop <= scrollTop + viewportHeight
												)
											);
										}

										// Add this page's height to the `offsetTop`.
										offsetTop += pageHeight;

										if (newCulledPages[pageID] !== culledPagesRef.current[pageID]) {
											culledPagesChanged = true;
										}
									};

									if (sortMode === 'oldest') {
										for (let pageID = 1; pageID <= lastPageID; pageID++) {
											iteratePage(pageID);
										}
									} else {
										for (let pageID = lastPageID; pageID >= 1; pageID--) {
											iteratePage(pageID);
										}
									}
								} else {
									// There are no pages, so `culledPagesChanged` should only be set to `true` if there were previously culled pages.
									culledPagesChanged = Object.values(culledPagesRef.current).length !== 0;
								}

								if (culledPagesChanged) {
									setCulledPages(newCulledPages);

									// Run this function again in case height estimations becoming more accurate due to this culling update changed which pages should be culled.
									throttledUpdateCulledPages();
								}
							} else {
								// If this point is reached, `viewMode === 'grid'`.

								const newGridCullingInfo = { ...defaultGridCullingInfo };

								// If `pageElements.length === 0`, the entire below `if` block won't execute, and the values of `newGridCullingInfo` will equal those of `defaultGridCullingInfo`. This is to prevent permanently culling all pages if there have ever been 0 page elements.
								if (pageElements.length) {
									const {
										pageHeight,
										pageCount,
										rowsAboveView,
										rowsBelowView,
										pagesAboveView,
										pagesInView
									} = calculateGridSizeInfo(formikPropsRef, pageElements[0]);

									newGridCullingInfo.firstIndex = pagesAboveView;
									newGridCullingInfo.lastIndex = Math.max(
										newGridCullingInfo.firstIndex,
										Math.min(
											newGridCullingInfo.firstIndex + pagesInView,
											pageCount
										) - 1
									);
									// The reason we don't just calculate `lastIndex` as `pageCount - 1 - (rowsBelowView * pagesPerRow)` is because `rowsBelowView * pagesPerRow` is not necessarily equal to the number of pages below view, since the last row may not be completely full.

									if (sortMode === 'newest') {
										[newGridCullingInfo.firstIndex, newGridCullingInfo.lastIndex] = [
											pageCount - 1 - newGridCullingInfo.lastIndex,
											pageCount - 1 - newGridCullingInfo.firstIndex
										];
									}

									newGridCullingInfo.paddingTop = rowsAboveView * pageHeight;
									newGridCullingInfo.paddingBottom = rowsBelowView * pageHeight;
								}

								if (!(
									newGridCullingInfo.firstIndex === gridCullingInfoRef.current.firstIndex
									&& newGridCullingInfo.lastIndex === gridCullingInfoRef.current.lastIndex
									&& newGridCullingInfo.paddingTop === gridCullingInfoRef.current.paddingTop
									&& newGridCullingInfo.paddingBottom === gridCullingInfoRef.current.paddingBottom
								)) {
									// If not all the values of `gridCullingInfo` are the same, update `gridCullingInfo` with the new values.
									setGridCullingInfo(newGridCullingInfo);
								}
							}
						};

						const _updateCulledPages = addViewportListener(updateCulledPages);

						/** Calls `updateCulledPages` throttled by `frameThrottler`. */
						const throttledUpdateCulledPages = () => {
							frameThrottler(_updateCulledPages)
								.then(updateCulledPages);
						};

						// We use `focusin` instead of `focus` because the former bubbles while the latter doesn't, and we want to capture any focus event among the page elements.
						document.addEventListener('focusin', throttledUpdateCulledPages);
						// We don't listen to `focusout` because, if the user is trying to change focus to an element outside of view, then when `focusout` is dispatched, `document.activeElement` is set to `null`, causing the element which the user is trying to focus to instead be culled.
						// Also, listening to `focusout` isn't necessary for any pragmatic reason, and not doing so can improve performance significantly by updating the culled page elements half as often when frequently changing focus.

						// Call `updateCulledPages` synchronously so the user can't see culled pages for a frame.
						updateCulledPages();

						return () => {
							removeViewportListener(_updateCulledPages);
							document.removeEventListener('focusin', throttledUpdateCulledPages);
						};
					}, [defaultCulledHeight, pageValues.length, viewMode, sortMode, culledPagesRef, gridCullingInfoRef]);

					const pageComponents: ReactNode[] = [];

					/** A ref to the next React key a `ClientStoryPage` should use. This is incremented after each time it is assigned to a page. */
					const nextKeyRef = useRef(0);

					let firstDraftID: StoryPageID | undefined;
					let lastNonDraftID: StoryPageID | undefined;

					// It is necessary to check for `pageValues.length` to prevent the `for` loop from trying to iterate over pages that don't exist when there are 0 pages.
					if (pageValues.length) {
						/** The lowest `pageValues` index to call `iteratePage` on. */
						let firstIndex;
						/** The highest `pageValues` index to call `iteratePage` on. */
						let lastIndex;

						if (viewMode === 'list') {
							firstIndex = 0;
							lastIndex = pageValues.length - 1;
						} else {
							({ firstIndex, lastIndex } = gridCullingInfo);
						}

						/** The sum of cached heights of consecutive culled pages when `viewMode === 'list'`. */
						let cachedHeightSum = 0;

						const iteratePage = (
							/** The index of this page in `pageValues`. */
							i: integer
						) => {
							// This is typed as nullable because `i` may not index a real page if there should be no pages in view.
							const page = pageValues[i] as KeyedClientStoryPage | undefined;

							if (!page) {
								// If `i` doesn't index a real page, don't iterate over it.
								return;
							}

							// If this page doesn't have a React key yet, set one.
							if (!(_key in page)) {
								page[_key] = nextKeyRef.current++;
							}

							const initialPublished = (
								formikPropsRef.current.initialValues.pages[page.id] as ClientStoryPage | undefined
							)?.published;

							// Set `firstDraftID` and `lastNonDraftID`.
							if (initialPublished === undefined) {
								if (
									// If `sortMode === 'oldest'`, set `firstDraftID` to the first applicable iterated page.
									firstDraftID === undefined
									// If `sortMode === 'newest'`, set `firstDraftID` to the last applicable iterated page.
									|| sortMode === 'newest'
								) {
									firstDraftID = page.id;
								}
							} else if (
								// If `sortMode === 'oldest'`, set `lastNonDraftID` to the last applicable iterated page.
								sortMode === 'oldest'
								// If `sortMode === 'newest'`, set `lastNonDraftID` to the first applicable iterated page.
								|| lastNonDraftID === undefined
							) {
								lastNonDraftID = page.id;
							}

							if (viewMode === 'list') {
								if (!(page.id in culledPages)) {
									// Having more than a few pages unculled leads to unacceptably large load times.
									// We choose not to cull only the first page and the last pages by default because they must always be unculled (for reasons explained in the comments of `updateCulledPages`).
									culledPages[page.id] = !(
										page.id === 1
										|| page.id === pageValues.length
									);
								}

								const pageKey = page[_key];

								// Check if this page is culled.
								if (culledPages[page.id]!) {
									cachedHeightSum += cachedPageHeightsRef.current[pageKey] || defaultCulledHeight;
								} else {
									pageComponents.push(
										<StoryEditorPageListing
											// The `key` cannot be set to `page.id`, or else each page's states would not be respected when deleting or rearranging pages. A page's ID can change, but its key should not.
											key={pageKey}
											marginTop={cachedHeightSum}
											page={page}
											initialPublished={initialPublished}
											advancedShown={advancedShownPageKeys.includes(pageKey)}
										/>
									);

									// Since an unculled page was found, reset the height sum for consecutive culled pages.
									cachedHeightSum = 0;
								}
							} else {
								// If this point is reached, `viewMode === 'grid'`.

								const pageStatus = (
									initialPublished === undefined
										? 'draft' as const
										: initialPublished <= Date.now()
											? 'published' as const
											: 'scheduled' as const
								);

								const selected = selectedPages.includes(page.id);

								pageComponents.push(
									<Section
										key={page[_key]}
										id={`p${page.id}`}
										className={`story-editor-page ${pageStatus}${selected ? ' selected' : ''}`}
										heading={page.id}
										title={page.title}
										onClick={onClickPageTile}
									>
										{page.title}
									</Section>
								);
							}
						};

						if (sortMode === 'oldest') {
							for (let i = firstIndex; i <= lastIndex; i++) {
								iteratePage(i);
							}
						} else {
							for (let i = lastIndex; i >= firstIndex; i--) {
								iteratePage(i);
							}
						}
					}

					/** Toggles whether a page listing's advanced section is open. */
					const toggleAdvancedShown = useFunction((
						/** The key of the page to toggle the advanced section of. */
						pageKey: integer
					) => {
						const pageKeyIndex = advancedShownPageKeys.indexOf(pageKey);
						if (pageKeyIndex === -1) {
							// Add this `pageKey` to the `advancedShownPageKeys`.
							setAdvancedShownPageKeys([
								...advancedShownPageKeys,
								pageKey
							]);
						} else {
							// Remove this `pageKey` from the `advancedShownPageKeys`.
							setAdvancedShownPageKeys([
								...advancedShownPageKeys.slice(0, pageKeyIndex),
								...advancedShownPageKeys.slice(pageKeyIndex + 1, advancedShownPageKeys.length)
							]);
						}
					});

					/** A ref to the `#story-editor-pages-actions` element. */
					const pagesActionsElementRef = useRef<HTMLDivElement>(null!);
					useSticky(pagesActionsElementRef);

					// This is because ESLint doesn't recognize `story.id` as a necessary hook dependency.
					const storyID = story.id;

					return (
						<StoryEditorContext.Provider
							value={
								// These values are passed through a context rather than directly as props to reduce `React.memo`'s prop comparison performance cost in `StoryEditorPageListing`.
								useMemo(() => ({
									storyID,
									firstDraftID,
									lastNonDraftID,
									formikPropsRef,
									setInitialPages,
									queuedValuesRef,
									isSubmitting: formikProps.isSubmitting,
									cachedPageHeightsRef,
									toggleAdvancedShown
								}), [formikProps.isSubmitting, firstDraftID, lastNonDraftID, storyID, toggleAdvancedShown])
							}
						>
							<Form
								ref={useSubmitOnSave(formikProps, viewMode === 'list')}
							>
								<StoryEditorPagesOptions
									story={story}
									setStory={setStory}
									viewMode={viewMode}
									setViewMode={setViewMode}
									sortMode={sortMode}
									setSortMode={setSortMode}
									pageCount={pageValues.length}
								/>
								{viewMode === 'list' ? (
									<StoryEditorPageList
										pagesActionsElementRef={pagesActionsElementRef}
										story={story}
										pageComponents={pageComponents}
									/>
								) : (
									<StoryEditorPageGrid
										pagesActionsElementRef={pagesActionsElementRef}
										selectedPages={selectedPages}
										setSelectedPages={setSelectedPages}
										advancedShownPageKeys={advancedShownPageKeys}
										setAdvancedShownPageKeys={setAdvancedShownPageKeys}
										pageCount={pageValues.length}
										gridCullingInfo={gridCullingInfo}
										pageComponents={pageComponents}
									/>
								)}
							</Form>
						</StoryEditorContext.Provider>
					);
				}}
			</Formik>
		</Page>
	);

	return (
		<StoryIDContext.Provider value={story.id}>
			<PrivateStoryContext.Provider
				value={useMemo(() => [story, setStory], [story, setStory])}
			>
				{pageComponent}
			</PrivateStoryContext.Provider>
		</StoryIDContext.Provider>
	);
};

export default StoryEditor;