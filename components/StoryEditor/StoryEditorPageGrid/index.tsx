import './styles.module.scss';
import Button from 'components/Button';
import shouldIgnoreControl from 'lib/client/shouldIgnoreControl';
import type { Dispatch, ReactNode, RefObject, SetStateAction } from 'react';
import React, { useContext, useEffect } from 'react';
import type { KeyedClientStoryPage } from 'components/StoryEditor';
import { StoryEditorContext, KEY_PROP } from 'components/StoryEditor';
import { Field } from 'formik';
import type { APIClient } from 'lib/client/api';
import api from 'lib/client/api';
import deleteFromClientStoryPageRecord from 'lib/client/deleteFromClientStoryPageRecord';
import Dialog from 'components/Dialog';
import useFunction from 'lib/client/reactHooks/useFunction';
import type { StoryPageID } from 'lib/server/stories';
import type { integer } from 'lib/types';
import useLatest from 'lib/client/reactHooks/useLatest';
import classNames from 'classnames';
import type { Updater } from 'use-immer';
import Action from 'components/Dialog/Action';
import type { MovePagesDialogValues } from 'components/StoryEditor/StoryEditorPageGrid/MovePagesDialog.tsx';
import MovePagesDialog from 'components/StoryEditor/StoryEditorPageGrid/MovePagesDialog.tsx';
import getPagesString from 'lib/client/getPagesString';

type StoryPagesAPI = APIClient<typeof import('pages/api/stories/[storyID]/pages').default>;
type StoryMovePagesAPI = APIClient<typeof import('pages/api/stories/[storyID]/pages/move').default>;

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
	updateAdvancedShownPageKeys: Updater<integer[]>,
	pageCount: integer,
	gridCullingInfo: GridCullingInfo,
	pageComponents: ReactNode[]
};

const StoryEditorPageGrid = ({
	pagesActionsElementRef,
	selectedPages,
	setSelectedPages,
	advancedShownPageKeys,
	updateAdvancedShownPageKeys,
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

	const deleteSelectedPages = useFunction(async () => {
		formikPropsRef.current.setSubmitting(true);

		if (!await Dialog.confirm(
			selectedPages.length === 1 ? (
				<Dialog id="delete-pages" title="Delete Page">
					Are you sure you want to delete page {selectedPages[0]}?<br />
					<br />
					This cannot be undone.
				</Dialog>
			) : (
				<Dialog
					id="delete-pages"
					title="Delete Pages"
					initialValues={{ confirmed: false }}
				>
					{({ values: { confirmed } }) => (
						<>
							Are you sure you want to delete the {selectedPages.length} selected pages?<br />
							<br />
							This cannot be undone.<br />
							<br />
							<label>
								<Field
									type="checkbox"
									name="confirmed"
									className="spaced"
									required
									autoFocus
								/>
								<span className="spaced bolder">
									I am sure I want to permanently delete {getPagesString(selectedPages)}.
								</span>
							</label>

							<Action disabled={!confirmed}>
								Yes
							</Action>
							{Action.NO}
						</>
					)}
				</Dialog>
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

		selectedPages.sort((a, b) => a - b);

		/** The ID of a page to delete. */
		let pageID: StoryPageID | undefined;
		while (
			// The next assigned `pageID` must be the one with the largest ID so that deleting this page doesn't shift the IDs of the selected pages around such that they become inaccurate in `selectedPages`. Popping the last item in `selectedPages` is sufficient for this due to `selectedPages` being sorted numerically above.
			// TODO: I don't understand the above reasoning. Why should `selectedPages` need to be sorted in order to delete them?
			pageID = selectedPages.pop()
		) {
			const page = newPages[pageID] as KeyedClientStoryPage;
			const pageKey = page[KEY_PROP];

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
			updateAdvancedShownPageKeys(newAdvancedShownPageKeys);
		}

		setSelectedPages([]);
		setInitialPages(newPages);

		formikPropsRef.current.setSubmitting(false);
	});

	const moveSelectedPages = useFunction(async () => {
		formikPropsRef.current.setSubmitting(true);

		const dialog = await Dialog.create<MovePagesDialogValues>(
			<MovePagesDialog
				pages={formikPropsRef.current.values.pages}
				selectedPages={selectedPages}
				pageCount={pageCount}
			/>
		);

		if (dialog.canceled) {
			formikPropsRef.current.setSubmitting(false);
			return;
		}

		let index = dialog.values.targetPageID as number;
		if (dialog.values.relation === 'before') {
			index--;
		}

		const {
			data: { changedPageIDs, changedPages }
		} = await (api as StoryMovePagesAPI).post(`/stories/${storyID}/pages/move`, {
			// This must be sorted because this API moves the pages into the same order as this array, and we don't want to change the order of the selected pages.
			pageIDs: selectedPages.sort((a, b) => a - b),
			index
		}).catch(error => {
			formikPropsRef.current.setSubmitting(false);

			return Promise.reject(error);
		});

		// Preserve the React keys of updated pages.
		for (const [oldPageID, newPageID] of Object.entries(changedPageIDs)) {
			const oldPage = formikPropsRef.current.values.pages[+oldPageID] as KeyedClientStoryPage;
			const newPage = changedPages[newPageID] as KeyedClientStoryPage;

			newPage[KEY_PROP] = oldPage[KEY_PROP];
		}

		setInitialPages({
			...formikPropsRef.current.initialValues.pages,
			...changedPages
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
				className={classNames('view-mode-grid', { disabled: formikPropsRef.current.isSubmitting })}
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
