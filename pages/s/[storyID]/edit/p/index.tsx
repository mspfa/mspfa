import './styles.module.scss';
import Page from 'components/Page';
import { Perm } from 'modules/client/perms';
import { withErrorPage } from 'modules/client/errors';
import { withStatusCode } from 'modules/server/errors';
import type { FormikProps } from 'formik';
import { Field, Form, Formik } from 'formik';
import type { ChangeEvent, Dispatch, MouseEvent, MutableRefObject, ReactNode, SetStateAction } from 'react';
import { useCallback, useRef, useState, useEffect, createContext, useMemo } from 'react';
import { getChangedValues, useLeaveConfirmation } from 'modules/client/forms';
import Box from 'components/Box';
import Button from 'components/Button';
import type { StoryID, StoryPageID } from 'modules/server/stories';
import { getClientStoryPage, getPrivateStory, getStoryByUnsafeID } from 'modules/server/stories';
import type { ClientStoryPage, ClientStoryPageRecord, PrivateStory } from 'modules/client/stories';
import BoxSection from 'components/Box/BoxSection';
import type { APIClient } from 'modules/client/api';
import Row from 'components/Row';
import Label from 'components/Label';
import api from 'modules/client/api';
import useThrottledCallback from 'modules/client/useThrottledCallback';
import axios from 'axios';
import StoryEditorPageListing from 'components/StoryEditorPageListing';
import { useIsomorphicLayoutEffect, useLatest } from 'react-use';
import Dialog from 'modules/client/Dialog';
import InlineRowSection from 'components/Box/InlineRowSection';
import FieldBoxRow from 'components/Box/FieldBoxRow';
import LabeledBoxRow from 'components/Box/LabeledBoxRow';
import { escapeRegExp } from 'lodash';
import BoxRow from 'components/Box/BoxRow';
import { useRouter } from 'next/router';
import frameThrottler, { frameThrottlerRequests, cancelFrameThrottler } from 'modules/client/frameThrottler';

type StoryAPI = APIClient<typeof import('pages/api/stories/[storyID]').default>;
type StoryPagesAPI = APIClient<typeof import('pages/api/stories/[storyID]/pages').default>;

export type Values = {
	/** An object mapping page IDs to their respective pages. Since this object has numeric keys, standard JavaScript automatically sorts its properties by lowest first. */
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
	[_key]: number
};

const _updateViewportOrCulledPages = Symbol('updateViewportOrCulledPages');

const defaultGridCullingInfo = {
	// The default `firstIndex` and `lastIndex` must both be 0 so that exactly one page is rendered, and its size can be used to process culling.
	/**
	 * The index of the first page that should be unculled.
	 *
	 * If there are no pages, this does not index a real page.
	 */
	firstIndex: 0,
	/**
	 * The index of the last page that should be unculled.
	 *
	 * If there are no pages, this does not index a real page.
	 */
	lastIndex: 0,
	/** The page container's top padding in pixels. */
	paddingTop: 0,
	/** The page container's bottom padding in pixels. */
	paddingBottom: 0
};

export const StoryEditorContext = createContext<{
	storyID: StoryID,
	firstDraftID: StoryPageID | undefined,
	formikPropsRef: MutableRefObject<FormikProps<Values>>,
	setInitialPages: Dispatch<SetStateAction<ClientStoryPageRecord>>,
	queuedValuesRef: MutableRefObject<Values | undefined>,
	/** Whether the form is loading. */
	isSubmitting: boolean,
	cachedPageHeightsRef: MutableRefObject<Partial<Record<number, number>>>
}>(undefined!);

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
			? window.innerHeight
			: pageContainerRect.top > window.innerHeight
				? 0
				: window.innerHeight - pageContainerRect.top
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

type ServerSideProps = {
	privateStory: PrivateStory,
	pages: ClientStoryPageRecord
} | {
	statusCode: number
};

const Component = withErrorPage<ServerSideProps>(({
	privateStory: initialPrivateStory,
	pages: initialPagesProp
}) => {
	const [privateStory, setPrivateStory] = useState(initialPrivateStory);
	const [initialPages, setInitialPages] = useState(initialPagesProp);

	const router = useRouter();

	const formikPropsRef = useRef<FormikProps<Values>>(null!);

	const defaultPageTitleInputRef = useRef<HTMLInputElement>(null!);

	const cancelTokenSourceRef = useRef<ReturnType<typeof axios.CancelToken.source>>();

	const changeDefaultPageTitle = useThrottledCallback(async (event: ChangeEvent<HTMLInputElement>) => {
		setPrivateStory({
			...privateStory,
			editorSettings: {
				...privateStory.editorSettings,
				defaultPageTitle: event.target.value
			}
		});
		// The reason the above state is updated before syncing with the server via the below request rather than after is so the user can use the new default page title while the request is still loading.

		cancelTokenSourceRef.current = axios.CancelToken.source();

		await (api as StoryAPI).put(`/stories/${privateStory.id}`, {
			editorSettings: {
				defaultPageTitle: event.target.value
			}
		}, {
			cancelToken: cancelTokenSourceRef.current.token
		});

		cancelTokenSourceRef.current = undefined;
	}, [privateStory]);

	const onChangeDefaultPageTitle = useCallback((event: ChangeEvent<HTMLInputElement>) => {
		cancelTokenSourceRef.current?.cancel();

		if (!event.target.reportValidity()) {
			return;
		}

		changeDefaultPageTitle(event);
	}, [changeDefaultPageTitle]);

	const findAndReplace = useCallback(async () => {
		const dialog = new Dialog({
			id: 'find-and-replace',
			title: 'Find and Replace',
			initialValues: {
				regex: false,
				find: '',
				flags: 'g',
				replace: ''
			},
			content: function Content({ values, setFieldValue }) {
				const findInputRef = useRef<HTMLInputElement>(null!);
				const flagsInputRef = useRef<HTMLInputElement>(null);

				useEffect(() => {
					let regexPatternError = false;

					if (values.regex && values.find) {
						try {
							new RegExp(values.find, '');
						} catch {
							regexPatternError = true;
						}

						let regexFlagsError = false;

						try {
							new RegExp('test', values.flags);
						} catch {
							regexFlagsError = true;
						}

						flagsInputRef.current!.setCustomValidity(regexFlagsError ? 'Please enter valid regex flags.' : '');
					}

					findInputRef.current.setCustomValidity(regexPatternError ? 'Please enter a valid regex pattern.' : '');
				}, [values.regex, values.find, values.flags]);

				return (
					<InlineRowSection>
						<BoxRow>Finds and replaces text in every page's content.</BoxRow>
						{values.regex ? (
							<LabeledBoxRow
								label="Find"
								htmlFor="field-find"
							>
								/
								<Field
									id="field-find"
									name="find"
									required
									autoFocus
									innerRef={findInputRef}
								/>
								/
								<Field
									id="field-find"
									name="flags"
									size="5"
									title="Flags"
									autoComplete="off"
									innerRef={flagsInputRef}
								/>
							</LabeledBoxRow>
						) : (
							<FieldBoxRow
								name="find"
								label="Find"
								required
								autoFocus
								innerRef={findInputRef as any}
							/>
						)}
						<FieldBoxRow
							name="replace"
							label="Replace With"
						/>
						<LabeledBoxRow
							label="Case-Sensitive"
							htmlFor="field-case-sensitive"
						>
							<input
								id="field-case-sensitive"
								type="checkbox"
								checked={!values.flags.includes('i')}
								onChange={
									useCallback((event: ChangeEvent<HTMLInputElement>) => {
										setFieldValue(
											'flags',
											event.target.checked
												? values.flags.replace(/i/g, '')
												: `${values.flags}i`
										);
									}, [setFieldValue, values.flags])
								}
							/>
						</LabeledBoxRow>
						<FieldBoxRow
							type="checkbox"
							name="regex"
							label="Regex"
							help={'If you don\'t know what this is, don\'t enable it.\n\nRegex allows for advanced search patterns and replacements.'}
						/>
					</InlineRowSection>
				);
			},
			actions: [
				{ label: 'Replace All', autoFocus: false },
				'Cancel'
			]
		});

		if (!(await dialog)?.submit) {
			return;
		}

		const find = (
			dialog.form!.values.regex
				? new RegExp(dialog.form!.values.find, dialog.form!.values.flags)
				: new RegExp(
					escapeRegExp(dialog.form!.values.find),
					`g${dialog.form!.values.flags.includes('i') ? 'i' : ''}`
				)
		);

		for (const page of Object.values(formikPropsRef.current.values.pages)) {
			const replacedContent = page.content.replace(find, dialog.form!.values.replace);

			if (page.content !== replacedContent) {
				formikPropsRef.current.setFieldValue(`pages.${page.id}.content`, replacedContent);
			}
		}
	}, []);

	const jumpToPage = useCallback(async () => {
		const dialog = new Dialog({
			id: 'jump-to-page',
			title: 'Jump to Page',
			initialValues: {
				pageID: '' as number | ''
			},
			content: (
				<InlineRowSection>
					<FieldBoxRow
						type="number"
						name="pageID"
						label="Page Number"
						required
						autoFocus
						min={1}
						max={Object.values(formikPropsRef.current.values.pages).length}
					/>
				</InlineRowSection>
			),
			actions: [
				{ label: 'Jump!', autoFocus: false },
				'Cancel'
			]
		});

		if (!(await dialog)?.submit) {
			return;
		}

		location.hash = '';
		location.hash = `p${dialog.form!.values.pageID}`;
	}, []);

	const newPage = useCallback(() => {
		const pages = Object.values(formikPropsRef.current.values.pages);

		// Get the ID of a new page being added after the last one.
		const id = (
			pages.length
				? +pages[pages.length - 1].id + 1
				: 1
		);

		const newPage: ClientStoryPage = {
			id,
			title: privateStory.editorSettings.defaultPageTitle,
			content: '',
			nextPages: [id + 1],
			unlisted: false,
			disableControls: false,
			commentary: '',
			notify: true
		};

		formikPropsRef.current.setFieldValue('pages', {
			...formikPropsRef.current.values.pages,
			[id]: newPage
		});

		// Wait for the newly added editor page to render.
		setTimeout(() => {
			// Select the title field of the newly added page.
			(document.getElementById(`field-pages-${id}-title`) as HTMLInputElement | null)?.select();
		});
	}, [privateStory.editorSettings.defaultPageTitle]);

	return (
		<Page heading="Edit Adventure">
			<Formik<Values>
				initialValues={{
					pages: initialPages
				}}
				onSubmit={
					useCallback(async values => {
						const changedValues = getChangedValues(initialPages, values.pages);

						if (!changedValues) {
							return;
						}

						const { data: newPages } = await (api as StoryPagesAPI).put(`/stories/${privateStory.id}/pages`, changedValues as any);

						// Preserve the React keys of updated pages.
						for (const newPage of Object.values(newPages)) {
							(newPage as KeyedClientStoryPage)[_key] = (
								values.pages[newPage.id] as KeyedClientStoryPage
							)[_key];
						}

						setInitialPages({
							...initialPages,
							...newPages
						});
					}, [privateStory.id, initialPages])
				}
				// Even though we have no `validate` function, these three props are necessary to set as a significant performance optimization.
				validateOnChange={false}
				validateOnBlur={false}
				validateOnMount={false}
				enableReinitialize
			>
				{formikProps => {
					// Using this instead of destructuring the Formik props directly is necessary as a performance optimization, to significantly reduce unnecessary re-renders.
					formikPropsRef.current = formikProps;

					useLeaveConfirmation(formikPropsRef.current.dirty);

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

					useIsomorphicLayoutEffect(() => {
						if (queuedValuesRef.current) {
							// Set the values queued in `queuedValuesRef`.
							formikPropsRef.current.setValues(queuedValuesRef.current);

							queuedValuesRef.current = undefined;
						}
					});

					const pageValues = Object.values(formikPropsRef.current.values.pages);

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

					const onClickPageTile = useCallback((event: MouseEvent<HTMLDivElement> & { target: HTMLDivElement }) => {
						const pageID = +event.target.id.slice(1);

						const newSelectedPages = [...selectedPages];

						if (event.shiftKey) {
							const startID = Math.min(lastActivePageIDRef.current, pageID);
							const endID = Math.max(lastActivePageIDRef.current, pageID);

							// If the user is not holding `ctrl` or `⌘`, deselect all pages outside the target range.
							if (!(event.ctrlKey || event.metaKey)) {
								while (newSelectedPages.pop()) {}
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
					}, [selectedPages]);

					// When `viewMode === 'list'`, this state is a record that maps page IDs to a boolean of their `culled` prop, or to undefined if the page hasn't been processed by `updateCulledPages` yet.
					const [culledPages, setCulledPages] = useState<Partial<Record<StoryPageID, boolean>>>({});
					// This ref is to prevent unnecessary updates to the effect hook which calls `updateCulledPages`.
					const culledPagesRef = useLatest(culledPages);

					// This state is the default height of a culled page element when `viewMode === 'list'`.
					const [defaultCulledHeight, setDefaultCulledHeight] = useState(
						// An arbitrary default culled page element height. Shouldn't be too small, or else unnecessary re-renders may occur initially due to a higher chance of more page elements being temporarily in view for a short time.
						350
					);
					/** A ref to whether `defaultCulledHeight` has still not been set. */
					const defaultCulledHeightUnsetRef = useRef(true);

					/** A ref to a partial record that maps each page's key to its cached height when `viewMode === 'list'`. */
					const cachedPageHeightsRef = useRef<Partial<Record<number, number>>>({});
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

						// Set query params.
						url.searchParams.set('view', viewMode);
						url.searchParams.set('sort', sortMode);

						// Update the URL's query params.
						history.replaceState(null, '', url);

						const updateLocationHash = () => {
							if (/^#p\d+$/.test(location.hash)) {
								const pageID = +location.hash.slice(2);

								const lastPageID = Object.values(formikPropsRef.current.values.pages).length;

								// Check if the target is a real page.
								if (
									pageID > 0
									&& pageID <= lastPageID
									// Check if the target location hash is a culled page.
								) {
									// Jump to where the target page is if it isn't culled, or where it would be if it weren't culled.

									// We can assert this is non-null because we have verified in that the target page exists, and if a page exists, then at least one page element (though not necessarily the one we're jumping to) must be mounted.
									const firstPageElement = document.getElementsByClassName('story-editor-page')[0] as HTMLDivElement;

									/** Offsets the inputted `scrollTop` by a certain amount for the user's convenience. */
									const offsetScrollTop = (scrollTop: number) => {
										const actionsStyle = window.getComputedStyle(actionsElementRef.current);

										if (actionsStyle.position === 'sticky') {
											const actionsRect = actionsElementRef.current.getBoundingClientRect();
											const actionsStyleTop = +actionsStyle.top.slice(0, -2);

											return scrollTop - (
												// Check if this element is currently stuck to its `style.top`.
												actionsRect.top === actionsStyleTop
												// If the actions element isn't stuck, then check if it would be after this function's scroll.
												|| scrollTop >= document.documentElement.scrollTop + actionsRect.top + actionsRect.height
													? actionsStyleTop + actionsRect.height
													: 0
											) - (
												// Add an extra 4 pixels if `viewMode === 'list'` because it looks weird having the page listing up against the top of the screen.
												viewMode === 'list' ? 4 : 0
											);
										}

										return scrollTop;
									};

									if (viewMode === 'list') {
										let offsetTop = firstPageElement.offsetTop;

										const iteratePage = (pageID: StoryPageID) => {
											const pageHeight = cachedPageHeightsRef.current[
												// This page's key.
												(formikPropsRef.current.values.pages[pageID] as KeyedClientStoryPage)[_key]
											] ?? defaultCulledHeight;

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

										document.documentElement.scrollTop = offsetScrollTop(offsetTop);
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

										document.documentElement.scrollTop = offsetScrollTop(pageContainer.offsetTop + pageRow * pageHeight);
									}
								}
							}
						};

						window.addEventListener('hashchange', updateLocationHash);

						if (!calledUpdateLocationHashRef.current) {
							// This timeout is necessary to wait for the browser to jump to the location hash first so that `updateLocationHash` can run afterward uninterrupted.
							setTimeout(updateLocationHash);

							calledUpdateLocationHashRef.current = true;
						}

						return () => {
							window.removeEventListener('hashchange', updateLocationHash);
						};
					}, [defaultCulledHeight, viewMode, sortMode, gridCullingInfoRef, culledPagesRef]);

					/** A ref to the `#story-editor-actions` element. */
					const actionsElementRef = useRef<HTMLDivElement>(null!);

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

									// Compute this value beforehand for performance.
									const windowInnerHeight = window.innerHeight;

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
										if (pageElement.querySelector(':invalid')) {
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
													&& offsetTop <= scrollTop + windowInnerHeight
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

								// If `!pageElements.length`, the entire below `if` block won't execute, and the values of `newGridCullingInfo` will equal those of `defaultGridCullingInfo`. This is to prevent permanently culling all pages if there have ever been 0 page elements.

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

						/** Calls `updateCulledPages` throttled by `frameThrottler`. */
						const throttledUpdateCulledPages = () => {
							// Don't call `frameThrottler` if there is possibly already a pending animation frame request from `throttledUpdateViewport`, since this would then overwrite it and cancel the `updateViewport` call, which includes a call to `updateCulledPages` anyway.
							if (!frameThrottlerRequests[_updateViewportOrCulledPages]) {
								frameThrottler(_updateViewportOrCulledPages)
									.then(updateCulledPages);
							}
						};

						/** A function called whenever the viewport changes. */
						const updateViewport = () => {
							updateCulledPages();

							const actionsStyle = window.getComputedStyle(actionsElementRef.current);
							if (actionsStyle.position === 'sticky') {
								actionsElementRef.current.classList[
									actionsElementRef.current.getBoundingClientRect().top === +actionsStyle.top.slice(0, -2)
										? 'add'
										: 'remove'
								]('stuck');
							}
						};

						/** Calls `updateViewport` throttled by `frameThrottler`. */
						const throttledUpdateViewport = () => {
							frameThrottler(_updateViewportOrCulledPages)
								.then(updateViewport);
						};

						// Call `updateViewport` synchronously so the user can't see culled pages for a frame.
						updateViewport();

						document.addEventListener('scroll', throttledUpdateViewport);
						document.addEventListener('resize', throttledUpdateViewport);
						// We use `focusin` instead of `focus` because the former bubbles while the latter doesn't, and we want to capture any focus event among the page elements.
						document.addEventListener('focusin', throttledUpdateCulledPages);
						// We don't listen to `focusout` because, when `focusout` is dispatched, `document.activeElement` is set to `null`, causing any page element outside the view which the user is attempting to focus to instead be culled.
						// Also, listening to `focusout` isn't necessary for any pragmatic reason, and not doing so improves performance significantly by updating the culled page elements half as often when frequently changing focus.

						/** A media query which only matches if the current resolution equals the `window.devicePixelRatio` last detected by `listenToPixelRatio`. */
						let resolutionQuery: MediaQueryList;

						/** Gets the current resolution and calls `changePixelRatio` when it is no longer the current resolution. */
						const listenToPixelRatio = () => {
							const dpi = window.devicePixelRatio * 96;
							resolutionQuery = window.matchMedia(
								// Allow any resolution in the range between the floor and the ceiling of `dpi` to ensure it works on browsers that have insufficient precision on `devicePixelRatio` or on `resolution` queries.
								`(min-resolution: ${Math.floor(dpi)}dpi) and (max-resolution: ${Math.ceil(dpi)}dpi)`
							);

							// Listen for a change in the pixel ratio in order to detect when the browser's zoom level changes.
							resolutionQuery.addEventListener('change', changePixelRatio, { once: true });
						};

						/** A function called whenever the pixel ratio changes. */
						const changePixelRatio = () => {
							// Listen for further changes in the pixel ratio again.
							listenToPixelRatio();

							// The pixel ratio has changed, so the viewport has changed.
							throttledUpdateViewport();
						};

						listenToPixelRatio();

						return () => {
							cancelFrameThrottler(_updateViewportOrCulledPages);

							document.removeEventListener('scroll', throttledUpdateViewport);
							document.removeEventListener('resize', throttledUpdateViewport);
							document.removeEventListener('focusin', throttledUpdateCulledPages);
							resolutionQuery.removeEventListener('change', changePixelRatio);
						};
					}, [defaultCulledHeight, pageValues.length, viewMode, sortMode, culledPagesRef, gridCullingInfoRef]);

					const pageComponents: ReactNode[] = [];

					/** A ref to the next React key a `ClientStoryPage` should use. This is incremented after each time it is assigned to a page. */
					const nextKeyRef = useRef(0);

					let firstDraftID: StoryPageID | undefined;

					// It is necessary to check for `pageValues.length` to prevent the `for` loop from trying to iterate over pages that don't exist when there are 0 pages.
					if (pageValues.length) {
						let firstIndex = 0;
						let lastIndex = pageValues.length - 1;

						if (viewMode === 'grid') {
							({ firstIndex, lastIndex } = gridCullingInfo);
						}

						/** The sum of cached heights of consecutive culled pages when `viewMode === 'list'`. */
						let cachedHeightSum = 0;

						const iteratePage = (
							/** The index of this page in `pageValues`. */
							i: number
						) => {
							const page = pageValues[i] as KeyedClientStoryPage;

							// If this page doesn't have a React key yet, set one.
							if (!(_key in page)) {
								page[_key] = nextKeyRef.current++;
							}

							const initialPublished = (
								formikPropsRef.current.initialValues.pages[page.id] as ClientStoryPage | undefined
							)?.published;

							if (initialPublished === undefined) {
								firstDraftID = page.id;
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

								// Check if this page is culled.
								if (culledPages[page.id]!) {
									cachedHeightSum += cachedPageHeightsRef.current[page[_key]] || defaultCulledHeight;
								} else {
									pageComponents.push(
										<StoryEditorPageListing
											// The `key` cannot be set to `page.id`, or else each page's states would not be respected when deleting or rearranging pages. A page's ID can change, but its key should not.
											key={page[_key]}
											marginTop={cachedHeightSum}
											page={page}
											initialPublished={initialPublished}
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
									<BoxSection
										key={page[_key]}
										id={`p${page.id}`}
										className={`story-editor-page ${pageStatus}${selected ? ' selected' : ''}`}
										heading={page.id}
										title={page.title}
										onClick={onClickPageTile}
									>
										{page.title}
									</BoxSection>
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

					/**
					 * The values to pass into the `value` of the `StoryEditorContext`.
					 *
					 * These values are passed through a context rather than directly as `StoryEditorPageListing` props to reduce `React.memo`'s prop comparison performance cost.
					 */
					const storyEditorContext = useMemo(() => ({
						storyID: privateStory.id,
						firstDraftID,
						formikPropsRef,
						setInitialPages,
						queuedValuesRef,
						isSubmitting: formikProps.isSubmitting,
						cachedPageHeightsRef
						// This ESLint comment is necessary because ESLint doesn't know that `privateStory.id` can change.
						// eslint-disable-next-line react-hooks/exhaustive-deps
					}), [formikProps.isSubmitting, firstDraftID, privateStory.id]);

					return (
						<Form>
							<Box>
								<BoxSection
									id="story-editor-options"
									heading={privateStory.title}
								>
									<Row>
										<Button
											className="small"
											href={`/s/${privateStory.id}/edit`}
										>
											Edit Info
										</Button>
										<Button
											className="small"
											disabled={!pageValues.length}
											onClick={findAndReplace}
										>
											Find and Replace
										</Button>
										<Button
											className="small"
											disabled={!pageValues.length}
											onClick={jumpToPage}
										>
											Jump to Page
										</Button>
										<Button
											className="small"
											title={`Click to Set View Mode to ${viewMode === 'grid' ? 'List' : 'Grid'}`}
											disabled={formikPropsRef.current.isSubmitting}
											onClick={
												useCallback(() => {
													if (formikPropsRef.current.dirty) {
														new Dialog({
															id: 'story-editor-view-mode',
															title: 'View Mode',
															content: 'You cannot change the view mode with unsaved changes.'
														});
														return;
													}

													// Toggle the `viewMode` between `'list'` and `'grid'`.
													setViewMode(viewMode => viewMode === 'list' ? 'grid' : 'list');
												}, [])
											}
										>
											{`View: ${viewMode === 'grid' ? 'Grid' : 'List'}`}
										</Button>
									</Row>
									<Row>
										<Label
											className="spaced"
											htmlFor="field-default-page-title"
										>
											Default Page Title
										</Label>
										<input
											id="field-default-page-title"
											className="spaced"
											maxLength={500}
											defaultValue={privateStory.editorSettings.defaultPageTitle}
											autoComplete="off"
											onChange={onChangeDefaultPageTitle}
											ref={defaultPageTitleInputRef}
										/>
									</Row>
									<Row>
										<Label className="spaced" htmlFor="field-sort-pages">
											Sort Pages By
										</Label>
										<select
											id="field-sort-pages"
											className="spaced"
											defaultValue={sortMode}
											onChange={
												useCallback((event: ChangeEvent<HTMLSelectElement>) => {
													setSortMode(event.target.value as 'newest' | 'oldest');
												}, [])
											}
										>
											<option value="newest">Newest</option>
											<option value="oldest">Oldest</option>
										</select>
									</Row>
								</BoxSection>
							</Box>
							{viewMode === 'list' ? (
								<>
									<div
										id="story-editor-actions"
										className="mid"
										ref={actionsElementRef}
									>
										<Button onClick={newPage}>
											New Page
										</Button>
										<Button
											type="submit"
											className="alt"
											disabled={!formikPropsRef.current.dirty || formikPropsRef.current.isSubmitting}
										>
											Save All
										</Button>
									</div>
									<Box id="story-editor-pages" className="view-mode-list">
										<StoryEditorContext.Provider value={storyEditorContext}>
											{pageComponents}
										</StoryEditorContext.Provider>
									</Box>
								</>
							) : (
								<>
									<div
										id="story-editor-actions"
										className="mid"
										ref={actionsElementRef}
									>
										<Button>
											Select All
										</Button>
										<Button>
											Move
										</Button>
										<Button>
											Delete
										</Button>
									</div>
									<div
										id="story-editor-pages"
										className="view-mode-grid"
										style={{
											paddingTop: `${gridCullingInfo.paddingTop}px`,
											paddingBottom: `${gridCullingInfo.paddingBottom}px`
										}}
									>
										{pageComponents}
									</div>
								</>
							)}
						</Form>
					);
				}}
			</Formik>
		</Page>
	);
});

export default Component;

export const getServerSideProps = withStatusCode<ServerSideProps>(async ({ req, params }) => {
	const story = await getStoryByUnsafeID(params.storyID);

	if (!(
		story && req.user && (
			story.owner.equals(req.user._id)
			|| story.editors.some(userID => userID.equals(req.user!._id))
			|| req.user.perms & Perm.sudoRead
		)
	)) {
		return { props: { statusCode: 403 } };
	}

	const clientPages: ClientStoryPageRecord = {};

	for (const page of Object.values(story.pages)) {
		clientPages[page.id] = getClientStoryPage(page);
	}

	return {
		props: {
			privateStory: getPrivateStory(story),
			pages: clientPages
		}
	};
});