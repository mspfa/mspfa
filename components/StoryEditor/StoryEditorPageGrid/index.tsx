import './styles.module.scss';
import Button from 'components/Button';
import shouldIgnoreControl from 'lib/client/shouldIgnoreControl';
import type { Dispatch, ReactNode, RefObject, SetStateAction } from 'react';
import React, { useContext, useEffect, useRef } from 'react';
import type { KeyedClientStoryPage } from 'components/StoryEditor';
import { StoryEditorContext, _key } from 'components/StoryEditor';
import { Field } from 'formik';
import type { APIClient } from 'lib/client/api';
import api from 'lib/client/api';
import deleteFromClientStoryPageRecord from 'lib/client/deleteFromClientStoryPageRecord';
import Dialog from 'lib/client/Dialog';
import invalidPublishedOrder from 'lib/client/invalidPublishedOrder';
import type { ClientStoryPage } from 'lib/client/stories';
import useFunction from 'lib/client/reactHooks/useFunction';
import type { StoryPageID } from 'lib/server/stories';
import type { integer } from 'lib/types';
import useLatest from 'lib/client/reactHooks/useLatest';

type StoryPagesAPI = APIClient<typeof import('pages/api/stories/[storyID]/pages').default>;
type StoryMovePagesAPI = APIClient<typeof import('pages/api/stories/[storyID]/movePages').default>;

export const defaultGridCullingInfo = {
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

export type GridCullingInfo = typeof defaultGridCullingInfo;

export type StoryEditorPageGridProps = {
	pagesActionsElementRef: RefObject<HTMLDivElement>,
	selectedPages: StoryPageID[],
	setSelectedPages: Dispatch<SetStateAction<StoryPageID[]>>,
	advancedShownPageKeys: integer[],
	setAdvancedShownPageKeys: Dispatch<SetStateAction<integer[]>>,
	pageCount: integer,
	gridCullingInfo: GridCullingInfo,
	pageComponents: ReactNode[]
};

const StoryEditorPageGrid = ({
	pagesActionsElementRef,
	selectedPages,
	setSelectedPages,
	advancedShownPageKeys,
	setAdvancedShownPageKeys,
	pageCount,
	gridCullingInfo,
	pageComponents
}: StoryEditorPageGridProps) => {
	const {
		storyID,
		formikPropsRef,
		setInitialPages,
		cachedPageHeightsRef
	} = useContext(StoryEditorContext)!;

	/** A ref to the latest value of `advancedShownPageKeys` to avoid race conditions. */
	const advancedShownPageKeysRef = useLatest(advancedShownPageKeys);

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
							max={pageCount}
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

		setSelectedPages(selectedPages.map(pageID => changedPageIDs[pageID] || pageID));

		formikPropsRef.current.setSubmitting(false);
	});

	useEffect(() => {
		const onKeyDown = (event: KeyboardEvent) => {
			if (event.altKey) {
				// If the user is holding `alt`, let the browser handle it.
				return;
			}

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
		};

		document.addEventListener('keydown', onKeyDown);

		return () => {
			document.removeEventListener('keydown', onKeyDown);
		};
	}, [selectAll, deselectAll, deleteSelectedPages, formikPropsRef]);

	return (
		<>
			<div
				id="story-editor-pages-actions"
				className="mid"
				ref={pagesActionsElementRef}
			>
				<Button
					title={
						selectedPages.length
							? `Deselect Selected Pages (${selectedPages.length})`
							: `Select All Pages (${pageCount})`
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
	);
};

export default StoryEditorPageGrid;