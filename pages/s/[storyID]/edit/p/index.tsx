import './styles.module.scss';
import Page from 'components/Page';
import { Perm } from 'lib/client/perms';
import { withErrorPage } from 'lib/client/errors';
import { withStatusCode } from 'lib/server/errors';
import type { FormikProps } from 'formik';
import { Field, Form, Formik } from 'formik';
import type { ChangeEvent, Dispatch, MouseEvent, MutableRefObject, ReactNode, SetStateAction } from 'react';
import { useRef, useState, useEffect, createContext, useMemo } from 'react';
import useFunction from 'lib/client/useFunction';
import { getChangedValues, preventLeaveConfirmations, useLeaveConfirmation } from 'lib/client/forms';
import Box from 'components/Box';
import Button from 'components/Button';
import type { StoryID, StoryPageID } from 'lib/server/stories';
import { getClientStoryPage, getPrivateStory, getStoryByUnsafeID } from 'lib/server/stories';
import type { ClientStoryPage, ClientStoryPageRecord, PrivateStory } from 'lib/client/stories';
import deleteFromClientStoryPageRecord from 'lib/client/deleteFromClientStoryPageRecord';
import invalidPublishedOrder from 'lib/client/invalidPublishedOrder';
import BoxSection from 'components/Box/BoxSection';
import type { APIClient } from 'lib/client/api';
import Row from 'components/Row';
import Label from 'components/Label';
import api from 'lib/client/api';
import useThrottled from 'lib/client/useThrottled';
import axios from 'axios';
import StoryEditorPageListing from 'components/StoryEditorPageListing';
import { useIsomorphicLayoutEffect, useLatest } from 'react-use';
import Dialog from 'lib/client/Dialog';
import LabeledGrid from 'components/LabeledGrid';
import LabeledGridField from 'components/LabeledGrid/LabeledGridField';
import LabeledGridRow from 'components/LabeledGrid/LabeledGridRow';
import { escapeRegExp } from 'lodash';
import Router, { useRouter } from 'next/router';
import frameThrottler from 'lib/client/frameThrottler';
import shouldIgnoreControl from 'lib/client/shouldIgnoreControl';
import { addViewportListener, removeViewportListener } from 'lib/client/viewportListener';
import { useNavStoryID } from 'components/Nav';
import type { integer } from 'lib/types';
import useSticky from 'lib/client/useSticky';

type StoryAPI = APIClient<typeof import('pages/api/stories/[storyID]').default>;
type StoryPagesAPI = APIClient<typeof import('pages/api/stories/[storyID]/pages').default>;
type StoryMovePagesAPI = APIClient<typeof import('pages/api/stories/[storyID]/movePages').default>;

const getScrollPaddingTop = () => +document.documentElement.style.scrollPaddingTop.slice(0, -2);

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
	[_key]: integer
};

const defaultGridCullingInfo = {
	// The default `firstIndex` and `lastIndex` must both be 0 so that exactly one page is rendered, and its size can be used to process culling.
	/**
	 * The index of the first page that should be unculled.
	 *
	 * If there are no pages in view, this does not index a real page.
	 */
	firstIndex: 0,
	/**
	 * The index of the last page that should be unculled.
	 *
	 * If there are no pages in view, this does not index a real page.
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
	lastNonDraftID: StoryPageID | undefined,
	formikPropsRef: MutableRefObject<FormikProps<Values>>,
	setInitialPages: Dispatch<SetStateAction<ClientStoryPageRecord>>,
	queuedValuesRef: MutableRefObject<Values | undefined>,
	isSubmitting: boolean,
	cachedPageHeightsRef: MutableRefObject<Partial<Record<StoryPageID, number>>>,
	toggleAdvancedShown: (pageKey: integer) => void
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

type ServerSideProps = {
	privateStory: PrivateStory,
	pages: ClientStoryPageRecord
} | {
	statusCode: integer
};

const Component = withErrorPage<ServerSideProps>(({
	privateStory: initialPrivateStory,
	pages: initialPagesProp
}) => {
	const [privateStory, setPrivateStory] = useState(initialPrivateStory);
	const [initialPages, setInitialPages] = useState(initialPagesProp);

	useNavStoryID(privateStory.id);

	const formikPropsRef = useRef<FormikProps<Values>>(null!);
	const formRef = useRef<HTMLFormElement>(null!);

	const defaultPageTitleInputRef = useRef<HTMLInputElement>(null!);

	const cancelTokenSourceRef = useRef<ReturnType<typeof axios.CancelToken.source>>();

	const changeDefaultPageTitle = useThrottled(async (event: ChangeEvent<HTMLInputElement>) => {
		setPrivateStory({
			...privateStory,
			defaultPageTitle: event.target.value
		});
		// The reason the above state is updated before syncing with the server via the below request rather than after is so the user can use the new default page title while the request is still loading.

		cancelTokenSourceRef.current = axios.CancelToken.source();

		await (api as StoryAPI).put(`/stories/${privateStory.id}`, {
			defaultPageTitle: event.target.value
		}, {
			cancelToken: cancelTokenSourceRef.current.token
		});

		cancelTokenSourceRef.current = undefined;
	}, [privateStory]);

	const onChangeDefaultPageTitle = useFunction((event: ChangeEvent<HTMLInputElement>) => {
		cancelTokenSourceRef.current?.cancel();

		if (!event.target.reportValidity()) {
			return;
		}

		changeDefaultPageTitle(event);
	});

	const findAndReplace = useFunction(async () => {
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
					<LabeledGrid>
						<Row>Finds and replaces text in every page's content.</Row>
						{values.regex ? (
							<LabeledGridRow
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
							</LabeledGridRow>
						) : (
							<LabeledGridField
								name="find"
								label="Find"
								required
								autoFocus
								innerRef={findInputRef as any}
							/>
						)}
						<LabeledGridField
							name="replace"
							label="Replace With"
						/>
						<LabeledGridRow
							label="Case-Sensitive"
							htmlFor="field-case-sensitive"
						>
							<input
								id="field-case-sensitive"
								type="checkbox"
								checked={!values.flags.includes('i')}
								onChange={
									useFunction((event: ChangeEvent<HTMLInputElement>) => {
										setFieldValue(
											'flags',
											event.target.checked
												? values.flags.replace(/i/g, '')
												: `${values.flags}i`
										);
									})
								}
							/>
						</LabeledGridRow>
						<LabeledGridField
							type="checkbox"
							name="regex"
							label="Regex"
							help={'If you don\'t know what this is, don\'t enable it.\n\nRegex allows for advanced search patterns and replacements.'}
						/>
					</LabeledGrid>
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

		if (formikPropsRef.current.isSubmitting) {
			new Dialog({
				id: 'find-and-replace',
				title: 'Find and Replace',
				content: 'The specified action could not be completed, as the form is currently read-only.'
			});
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
	});

	const jumpToPage = useFunction(async () => {
		const dialog = new Dialog({
			id: 'jump-to-page',
			title: 'Jump to Page',
			initialValues: {
				pageID: '' as number | ''
			},
			content: (
				<LabeledGrid>
					<LabeledGridField
						type="number"
						name="pageID"
						label="Page Number"
						required
						autoFocus
						min={1}
						max={Object.values(formikPropsRef.current.values.pages).length}
					/>
				</LabeledGrid>
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
	});

	const newPage = useFunction(() => {
		const pages = Object.values(formikPropsRef.current.values.pages);

		// Get the ID of a new page being added after the last one.
		const id = (
			pages.length
				? +pages[pages.length - 1].id + 1
				: 1
		);

		const newPage: ClientStoryPage = {
			id,
			title: privateStory.defaultPageTitle,
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
	});

	return (
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

						const { data: newInitialPages } = await (api as StoryPagesAPI).put(`/stories/${privateStory.id}/pages`, changedValues as any);

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
				{formikProps => {
					// Using this instead of destructuring the Formik props directly is necessary as a performance optimization, to significantly reduce unnecessary re-renders.
					formikPropsRef.current = formikProps;

					// This is because ESLint doesn't recognize `privateStory.id` as a necessary hook dependency.
					const storyID = privateStory.id;

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

					useIsomorphicLayoutEffect(() => {
						if (queuedValuesRef.current) {
							// Set the values queued in `queuedValuesRef`.
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
					/** A ref to the latest value of `advancedShownPageKeys` to reduce unnecessary callback dependencies. */
					const advancedShownPageKeysRef = useLatest(advancedShownPageKeys);

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

					const deselectAll = useFunction(() => {
						setSelectedPages([]);
					});

					const selectAll = useFunction(() => {
						setSelectedPages(Object.values(formikPropsRef.current.values.pages).map(({ id }) => id));
					});

					/** Mutates `selectedPages` to be sorted in ascending order and returns a user-friendly string describing the ranges of selected pages. */
					const sortAndGetSelectedPages = useFunction(() => {
						/** An array of objects representing closed intervals of selected page IDs. */
						const selectedPageRanges: Array<{
							/** The lower bound of this interval. */
							start: StoryPageID,
							/** The upper bound of this interval. */
							end: StoryPageID
						}> = [];

						/** The page ID most recently added to `selectedPageRanges`. */
						let previousPage: StoryPageID | undefined;

						for (const pageID of selectedPages.sort((a, b) => a - b)) {
							// Check whether this page is adjacent to the previous.
							if (previousPage === pageID - 1) {
								// Add this page to the last page range.
								selectedPageRanges[selectedPageRanges.length - 1].end = pageID;
							} else {
								// Add this page to a new page range.
								selectedPageRanges.push({ start: pageID, end: pageID });
							}

							previousPage = pageID;
						}

						/** An array of strings representing closed interval of selected page IDs. */
						const rangeStrings = selectedPageRanges.map(({ start, end }) => (
							start === end
								? `p${start}`
								: `p${start}-${end}`
						));

						return (
							rangeStrings.length === 1
								? rangeStrings[0]
								: rangeStrings.length === 2
									? `${rangeStrings[0]} and ${rangeStrings[1]}`
									: `${rangeStrings.slice(0, -1).join(', ')}, and ${rangeStrings[rangeStrings.length - 1]}`
						);
					});

					const deleteSelectedPages = useFunction(async () => {
						formikPropsRef.current.setSubmitting(true);

						if (!(
							(
								selectedPages.length === 1
								&& await Dialog.confirm({
									id: 'delete-pages',
									title: 'Delete Page',
									content: `Are you sure you want to delete page ${selectedPages[0]}?\n\nThis cannot be undone.`
								})
							) || (
								selectedPages.length !== 1
								&& await Dialog.confirm({
									id: 'delete-pages',
									title: 'Delete Pages',
									content: (
										<>
											Are you sure you want to delete the {selectedPages.length} selected pages?<br />
											<br />
											This cannot be undone.<br />
											<br />
											<label>
												<input
													type="checkbox"
													className="spaced"
													required
													autoFocus
												/>
												<span className="spaced bolder">
													I am sure I want to permanently delete {sortAndGetSelectedPages()}.
												</span>
											</label>
										</>
									),
									actions: [
										{ label: 'Yes', autoFocus: false },
										'No'
									]
								})
							)
						)) {
							formikPropsRef.current.setSubmitting(false);
							return;
						}

						await (api as StoryPagesAPI).delete(`/stories/${storyID}/pages`, {
							data: {
								pageIDs: selectedPages
							}
						}).catch(error => {
							formikPropsRef.current.setSubmitting(false);

							return Promise.reject(error);
						});

						let newPages = formikPropsRef.current.values.pages;

						const newAdvancedShownPageKeys = [...advancedShownPageKeysRef.current];
						let advancedShownPageKeysChanged = false;

						/** The ID of a page to delete. */
						let pageID: StoryPageID | undefined;
						while (
							// The next assigned `pageID` must be the one with the largest ID so that deleting this page doesn't shift the IDs of the selected pages around such that they become inaccurate in `selectedPages`. Popping the last item in `selectedPages` is sufficient for this due to `selectedPages` being sorted by `sortAndGetSelectedPages` earlier in this callback.
							pageID = selectedPages.pop()
						) {
							const page = newPages[pageID] as KeyedClientStoryPage;
							const pageKey = page[_key];

							// Delete the page from the `newPages`.
							newPages = deleteFromClientStoryPageRecord(pageID, newPages);

							// Delete the page's cached height.
							delete cachedPageHeightsRef.current[pageKey];

							const advancedShownPageKeyIndex = newAdvancedShownPageKeys.indexOf(pageKey);
							if (advancedShownPageKeyIndex !== -1) {
								newAdvancedShownPageKeys.splice(advancedShownPageKeyIndex, 1);
								advancedShownPageKeysChanged = true;
							}
						}

						if (advancedShownPageKeysChanged) {
							setAdvancedShownPageKeys(newAdvancedShownPageKeys);
						}

						setSelectedPages([]);
						setInitialPages(newPages);

						formikPropsRef.current.setSubmitting(false);
					});

					const moveSelectedPages = useFunction(async () => {
						formikPropsRef.current.setSubmitting(true);

						const selectedPagesString = sortAndGetSelectedPages();
						// The above function call sorts `selectedPages` so they are in order for the below two assignments and the page move API request.

						/** The selected page with the lowest ID. */
						const firstSelectedPage = formikPropsRef.current.values.pages[selectedPages[0]];
						/** The selected page with the highest ID. */
						const lastSelectedPage = formikPropsRef.current.values.pages[selectedPages[selectedPages.length - 1]];

						/** The position to insert the pages at. */
						let position: integer | undefined;

						const dialog = new Dialog({
							id: 'move-pages',
							title: 'Move Pages',
							initialValues: {
								relation: 'after' as 'before' | 'after',
								pageID: '' as number | ''
							},
							content: function Content({ values: { relation, pageID } }) {
								const pageIDInputRef = useRef<HTMLInputElement>(null!);

								useEffect(() => {
									const validPage = (
										typeof pageID === 'number'
										&& pageID in formikPropsRef.current.values.pages
									);

									/** The deselected page which the selected pages are being moved after. */
									let pageBefore: ClientStoryPage | undefined;
									/** The deselected page which the selected pages are being moved before. */
									let pageAfter: ClientStoryPage | undefined;

									if (validPage) {
										/** The ID of `pageBefore`. May not index a real page after the `while` loop. */
										let pageBeforeID = pageID + (relation === 'before' ? -1 : 0);
										while (selectedPages.includes(pageBeforeID)) {
											pageBeforeID--;
										}
										pageBefore = formikPropsRef.current.values.pages[pageBeforeID];

										position = pageBeforeID;

										/** The ID of `pageAfter`. May not index a real page after the `while` loop. */
										let pageAfterID = pageID + (relation === 'before' ? 0 : 1);
										while (selectedPages.includes(pageAfterID)) {
											pageAfterID++;
										}
										pageAfter = formikPropsRef.current.values.pages[pageAfterID];
									}

									pageIDInputRef.current.setCustomValidity(
										validPage
											? selectedPages.includes(pageID)
												? 'Please choose a page which is not selected.'
												// The `firstSelectedPage` is being moved after the `pageBefore`, so check if that arrangement is valid.
												: pageBefore && invalidPublishedOrder(pageBefore.published, firstSelectedPage.published)
													? `Page ${firstSelectedPage.id} can't be moved after page ${pageBefore.id} because page ${firstSelectedPage.id} would be published first.`
													// The `lastSelectedPage` is being moved before the `pageAfter`, so check if that arrangement is valid.
													: pageAfter && invalidPublishedOrder(lastSelectedPage.published, pageAfter.published)
														? `Page ${lastSelectedPage.id} can't be moved before page ${pageAfter.id} because page ${pageAfter.id} would be published first.`
														// All is valid.
														: ''
											// Let the browser handle the invalid page ID via the props on the `pageID` `Field`.
											: ''
									);
								}, [relation, pageID]);

								return (
									<>
										Where do you want to move {selectedPagesString}?<br />
										<br />
										This cannot be undone.<br />
										<br />
										<Field as="select" name="relation">
											<option value="before">before</option>
											<option value="after">after</option>
										</Field>
										{' page '}
										<Field
											type="number"
											name="pageID"
											required
											min={1}
											max={pageValues.length}
											autoFocus
											innerRef={pageIDInputRef}
										/>
									</>
								);
							},
							actions: [
								{ label: 'Move!', autoFocus: false },
								'Cancel'
							]
						});

						if (!(await dialog)?.submit) {
							formikPropsRef.current.setSubmitting(false);
							return;
						}

						const {
							data: {
								changedPageIDs,
								changedPages: newInitialPages
							}
						} = await (api as StoryMovePagesAPI).post(`/stories/${storyID}/movePages`, {
							pageIDs: selectedPages,
							position: position!
						}).catch(error => {
							formikPropsRef.current.setSubmitting(false);

							return Promise.reject(error);
						});

						// Preserve the React keys of updated pages.
						for (const oldPageIDString of Object.keys(changedPageIDs)) {
							const oldPageID = +oldPageIDString;
							const oldPage = formikPropsRef.current.values.pages[oldPageID] as KeyedClientStoryPage;
							const newPageID = changedPageIDs[oldPageID];
							const newPage = newInitialPages[newPageID] as KeyedClientStoryPage;

							newPage[_key] = oldPage[_key];
						}

						setInitialPages({
							...formikPropsRef.current.initialValues.pages,
							...newInitialPages
						});

						setSelectedPages(selectedPages.map(pageID => changedPageIDs[pageID]));

						formikPropsRef.current.setSubmitting(false);
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

					/** A ref to the `#story-editor-actions` element. */
					const actionsElementRef = useRef<HTMLDivElement>(null!);
					useSticky(actionsElementRef);

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

									// We can assert this is non-null because we have verified in that the target page exists, and if a page exists, then at least one page element (though not necessarily the one we're jumping to) must be mounted.
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

						const onKeyDown = (event: KeyboardEvent) => {
							if (event.altKey) {
								// If the user is holding `alt`, let the browser handle it.
								return;
							}

							// Check for `ctrl`+`S` or `⌘`+`S`.
							if ((event.ctrlKey || event.metaKey) && event.code === 'KeyS') {
								if (viewMode === 'list') {
									// Save all.
									if (formRef.current.reportValidity()) {
										// Save the focused element since it may be lost due to `isSubmitting`.
										const initialActiveElement = document.activeElement;

										formikPropsRef.current.submitForm().then(() => {
											// Restore focus to the `initialActiveElement` if possible.
											(initialActiveElement as any)?.focus?.();
										});
									}
								}

								// Prevent default regardless of `viewMode` in case they accidentally pressed it.
								event.preventDefault();
								return;
							}

							if (viewMode === 'grid') {
								if (shouldIgnoreControl()) {
									return;
								}

								// Check for `ctrl` or `⌘`.
								if (event.ctrlKey || event.metaKey) {
									if (event.code === 'KeyA') {
										if (!formikPropsRef.current.isSubmitting) {
											selectAll();
										}

										event.preventDefault();
										return;
									}

									if (event.code === 'KeyD') {
										if (!formikPropsRef.current.isSubmitting) {
											deselectAll();
										}

										event.preventDefault();
									}

									return;
								}

								if (event.code === 'Delete') {
									if (!formikPropsRef.current.isSubmitting) {
										deleteSelectedPages();
									}

									event.preventDefault();
								}
							}
						};

						document.addEventListener('keydown', onKeyDown);

						return () => {
							window.removeEventListener('hashchange', updateLocationHash);
							document.removeEventListener('keydown', onKeyDown);
						};
					}, [viewMode, sortMode, selectAll, deselectAll, deleteSelectedPages, gridCullingInfoRef, culledPagesRef, defaultCulledHeightRef]);

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

						const _updateCulledPages = addViewportListener(updateCulledPages);

						/** Calls `updateCulledPages` throttled by `frameThrottler`. */
						const throttledUpdateCulledPages = () => {
							frameThrottler(_updateCulledPages)
								.then(updateCulledPages);
						};

						// We use `focusin` instead of `focus` because the former bubbles while the latter doesn't, and we want to capture any focus event among the page elements.
						document.addEventListener('focusin', throttledUpdateCulledPages);
						// We don't listen to `focusout` because, when `focusout` is dispatched, `document.activeElement` is set to `null`, causing any page element outside the view which the user is attempting to focus to instead be culled.
						// Also, listening to `focusout` isn't necessary for any pragmatic reason, and not doing so improves performance significantly by updating the culled page elements half as often when frequently changing focus.

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
						let firstIndex = 0;
						let lastIndex = pageValues.length - 1;

						if (viewMode === 'grid') {
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

					/** Toggles whether a page listing's advanced section is open. */
					const toggleAdvancedShown = useFunction((
						/** The key of the page to toggle the advanced section of. */
						pageKey: integer
					) => {
						const pageKeyIndex = advancedShownPageKeysRef.current.indexOf(pageKey);
						if (pageKeyIndex === -1) {
							// Add this `pageKey` to the `advancedShownPageKeys`.
							setAdvancedShownPageKeys([
								...advancedShownPageKeysRef.current,
								pageKey
							]);
						} else {
							// Remove this `pageKey` from the `advancedShownPageKeys`.
							setAdvancedShownPageKeys([
								...advancedShownPageKeysRef.current.slice(0, pageKeyIndex),
								...advancedShownPageKeysRef.current.slice(pageKeyIndex + 1, advancedShownPageKeysRef.current.length)
							]);
						}
					});

					/**
					 * The values to pass into the `value` of the `StoryEditorContext`.
					 *
					 * These values are passed through a context rather than directly as `StoryEditorPageListing` props to reduce `React.memo`'s prop comparison performance cost.
					 */
					const storyEditorContext = useMemo(() => ({
						storyID,
						firstDraftID,
						lastNonDraftID,
						formikPropsRef,
						setInitialPages,
						queuedValuesRef,
						isSubmitting: formikProps.isSubmitting,
						cachedPageHeightsRef,
						toggleAdvancedShown
					}), [formikProps.isSubmitting, firstDraftID, lastNonDraftID, storyID, toggleAdvancedShown]);

					return (
						<Form ref={formRef}>
							<Box>
								<BoxSection
									id="story-editor-options"
									heading={privateStory.title}
								>
									<Row>
										<Button
											className="small"
											href={`/s/${storyID}/edit`}
										>
											Edit Info
										</Button>
										{viewMode === 'list' && (
											<Button
												className="small"
												disabled={formikPropsRef.current.isSubmitting || !pageValues.length}
												onClick={findAndReplace}
											>
												Find and Replace
											</Button>
										)}
										<Button
											className="small"
											disabled={!pageValues.length}
											onClick={jumpToPage}
										>
											Jump to Page
										</Button>
										<Button
											className="small"
											title={`Set View Mode to ${viewMode === 'grid' ? 'List' : 'Grid'}`}
											disabled={formikPropsRef.current.isSubmitting}
											onClick={
												useFunction(() => {
													if (formikPropsRef.current.dirty) {
														new Dialog({
															id: 'story-editor-view-mode',
															title: 'View Mode',
															content: 'You cannot change the view mode with unsaved changes.'
														});
														return;
													}

													setViewMode(viewMode === 'list' ? 'grid' : 'list');
												})
											}
										>
											{`View: ${viewMode === 'grid' ? 'Grid' : 'List'}`}
										</Button>
									</Row>
									{viewMode === 'list' && (
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
												defaultValue={privateStory.defaultPageTitle}
												autoComplete="off"
												onChange={onChangeDefaultPageTitle}
												ref={defaultPageTitleInputRef}
											/>
										</Row>
									)}
									<Row>
										<Label className="spaced" htmlFor="field-sort-pages">
											Sort Pages By
										</Label>
										<select
											id="field-sort-pages"
											className="spaced"
											defaultValue={sortMode}
											onChange={
												useFunction((event: ChangeEvent<HTMLSelectElement>) => {
													setSortMode(event.target.value as 'newest' | 'oldest');
												})
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
										<Button id="story-editor-back-to-top" href="#">
											Back to Top
										</Button>
										<Button
											disabled={formikPropsRef.current.isSubmitting}
											onClick={newPage}
										>
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
										<Button
											title={
												selectedPages.length
													? `Deselect Selected Pages (${selectedPages.length})`
													: `Select All Pages (${pageValues.length})`
											}
											disabled={formikPropsRef.current.isSubmitting}
											onClick={selectedPages.length ? deselectAll : selectAll}
										>
											{selectedPages.length ? 'Deselect All' : 'Select All'}
										</Button>
										<Button
											title={
												selectedPages.length
													? `Move Selected Pages (${selectedPages.length})`
													: undefined
											}
											disabled={formikPropsRef.current.isSubmitting || selectedPages.length === 0}
											onClick={moveSelectedPages}
										>
											Move
										</Button>
										<Button
											title={
												selectedPages.length
													? `Delete Selected Pages (${selectedPages.length})`
													: undefined
											}
											disabled={formikPropsRef.current.isSubmitting || selectedPages.length === 0}
											onClick={deleteSelectedPages}
										>
											Delete
										</Button>
									</div>
									<div
										id="story-editor-pages"
										className={`view-mode-grid${formikPropsRef.current.isSubmitting ? ' disabled' : ''}`}
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