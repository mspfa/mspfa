import './styles.module.scss';
import BoxSection from 'components/Box/BoxSection';
import type { ClientStoryPage, ClientStoryPageRecord } from 'modules/client/stories';
import { Field } from 'formik';
import Label from 'components/Label';
import BBField from 'components/BBCode/BBField';
import type { MouseEvent } from 'react';
import React, { useCallback, useRef, useState, useEffect, useContext } from 'react';
import AddButton from 'components/Button/AddButton';
import type { KeyedClientStoryPage } from 'pages/s/[storyID]/edit/p';
import { StoryEditorContext, _key } from 'pages/s/[storyID]/edit/p';
import RemoveButton from 'components/Button/RemoveButton';
import { isEqual } from 'lodash';
import Timestamp from 'components/Timestamp';
import InlineRowSection from 'components/Box/InlineRowSection';
import FieldBoxRow from 'components/Box/FieldBoxRow';
import Button from 'components/Button';
import type { StoryPageID } from 'modules/server/stories';
import Dialog from 'modules/client/Dialog';
import Row from 'components/Row';
import Link from 'components/Link';
import type { APIClient } from 'modules/client/api';
import api from 'modules/client/api';
import { getChangedValues } from 'modules/client/forms';
import type { DateNumber, RecursivePartial } from 'modules/types';
import DateField from 'components/DateField';

type StoryPagesAPI = APIClient<typeof import('pages/api/stories/[storyID]/pages').default>;
type StoryPageAPI = APIClient<typeof import('pages/api/stories/[storyID]/pages/[pageID]').default>;

/** The maximum duration accepted by `setTimeout`. */
const MAX_TIMEOUT = 2147483647;

/**
 * Deletes a page from a `ClientStoryPageRecord` by its ID. Returns the new `ClientStoryPageRecord`.
 *
 * Does not mutate any values passed in.
 */
const deleteFromClientStoryPageRecord = (
	/** The ID of the page to delete. */
	deletedPageID: StoryPageID,
	/** The record to delete the page from. */
	pages: ClientStoryPageRecord
) => {
	const newPages: ClientStoryPageRecord = {};

	for (const oldPage of Object.values(pages)) {
		if (oldPage.id === deletedPageID) {
			// Skip the page being deleted.
			continue;
		}

		const newPage = { ...oldPage };

		// Adjust IDs of pages after the deleted page.
		if (oldPage.id > deletedPageID) {
			newPage.id--;
		}

		// Adjust `nextPages` IDs of pages after the deleted page.
		for (let i = 0; i < newPage.nextPages.length; i++) {
			if (newPage.nextPages[i] > deletedPageID) {
				newPage.nextPages[i]--;
			}
		}

		newPages[newPage.id] = newPage;
	}

	return newPages;
};

// DO NOT add a `children` prop to this component unless practical. It is noticeably less performant than other props.
export type StoryEditorPageListingProps = {
	/** The number of pixels to be added to this element's `style.marginTop` for holding the place of all consecutive culled page listings above this one. */
	marginTop: number,
	/** The `ClientStoryPage` being edited. */
	page: KeyedClientStoryPage,
	/** This page's `published` value in the `initialValues`. */
	initialPublished: number | undefined
};

/** A `BoxSection` for a page in the story editor when in the list view mode. */
const StoryEditorPageListing = React.memo(({
	marginTop,
	page,
	initialPublished
}: StoryEditorPageListingProps) => {
	const {
		storyID,
		firstDraftID,
		formikPropsRef,
		setInitialPages,
		queuedValuesRef,
		isSubmitting,
		cachedPageHeightsRef
	} = useContext(StoryEditorContext);

	/** Whether this page exists on the server. */
	const onServer = page.id in formikPropsRef.current.initialValues.pages;

	/** Whether this page exists on the server and has the same values as on the server. */
	const saved = onServer && isEqual(page, formikPropsRef.current.initialValues.pages[page.id]);

	const pageStatus = (
		initialPublished === undefined
			? 'draft' as const
			: initialPublished <= Date.now()
				? 'published' as const
				: 'scheduled' as const
	);

	const [, update] = useState(false);

	// An effect hook to automatically re-render this component when the `pageStatus` should change from `'scheduled'` to `'published'`.
	useEffect(() => {
		if (pageStatus === 'scheduled') {
			const timeout = setTimeout(() => {
				// Re-render this component.
				update(value => !value);
			}, Math.min(
				// The time until the schedule date.
				initialPublished! - Date.now(),
				// If the time until the schedule date is over the `MAX_TIMEOUT`, it's still fine if the timeout finishes before the schedule date, because whenever the timeout finishes, `setTimeout` would be called here again.
				MAX_TIMEOUT
			));

			return () => {
				clearTimeout(timeout);
			};
		}
	}, [pageStatus, initialPublished]);

	const ref = useRef<HTMLDivElement>(null!);

	const removeNextPage = useCallback((event: MouseEvent<HTMLButtonElement & HTMLAnchorElement> & { target: HTMLButtonElement }) => {
		// The `parentNode` of this `RemoveButton` will be the `div.story-editor-next-page` element.
		const nextPageElement = event.target.parentNode as HTMLDivElement;

		/** The index of the value in `page.nextPages` being removed, equal to the index of the `nextPageElement` in its parent `div.story-editor-next-page-container` element. */
		const nextPageIndex = Array.prototype.indexOf.call(nextPageElement.parentNode!.childNodes, nextPageElement);

		formikPropsRef.current.setFieldValue(`pages.${page.id}.nextPages`, [
			...page.nextPages.slice(0, nextPageIndex),
			...page.nextPages.slice(nextPageIndex + 1, page.nextPages.length)
		]);
	}, [formikPropsRef, page.id, page.nextPages]);

	const addNextPage = useCallback(() => {
		formikPropsRef.current.setFieldValue(`pages.${page.id}.nextPages`, [
			...page.nextPages,
			''
		]);

		// Wait for the newly added next page to render.
		setTimeout(() => {
			lastNextPageInputRef.current?.focus();
		});
	}, [formikPropsRef, page.id, page.nextPages]);

	const lastNextPageInputRef = useRef<HTMLInputElement>(null);

	/** If an invalid element is found in this page listing, reports its validity and returns `false`. Otherwise, returns `true`. */
	const reportPageValidity = useCallback((
		/** Whether to only check the validity of advanced options. */
		onlyAdvanced = false,
		/** The IDs of pages to report the validity of. */
		pageIDs?: StoryPageID[]
	) => {
		let selector = ':invalid';

		if (onlyAdvanced) {
			selector = `.story-editor-page-advanced ${selector}`;
		}

		// If this page is the only page in `pageIDs` anyway, then `pageIDs` is unneeded and can be set to `undefined` as an optimization.
		if (
			pageIDs
			&& pageIDs.length === 1
			&& pageIDs[0] === page.id
		) {
			pageIDs = undefined;
		}

		if (pageIDs) {
			selector = pageIDs.map(pageID => `#p${pageID} ${selector}`).join(', ');
		}

		const container = pageIDs ? ref.current.parentNode! : ref.current;

		const invalidElement = container.querySelector<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>(selector);

		if (invalidElement) {
			invalidElement.reportValidity();
			return false;
		}

		return true;
	}, [page.id]);

	const [advancedShown, setAdvancedShown] = useState(false);

	const toggleAdvanced = useCallback(() => {
		if (advancedShown && !reportPageValidity(true)) {
			// Don't let the advanced section be hidden if it contains invalid fields, or else the invalid fields wouldn't be detectable.
			return;
		}

		setAdvancedShown(advancedShown => !advancedShown);
	}, [advancedShown, reportPageValidity]);

	const savePage = useCallback(async () => {
		/** The IDs of pages to save. */
		const pageIDsToSave: number[] = [page.id];

		/** The pages to save. */
		const pagesToSave: ClientStoryPageRecord = {
			[page.id]: formikPropsRef.current.values.pages[page.id]
		};

		/** The pages to save from `initialValues`. */
		const initialPagesToSave: ClientStoryPageRecord = {
			[page.id]: formikPropsRef.current.initialValues.pages[page.id]
		};

		if (!onServer) {
			// If this page is not on the server, all pages before it which are also not on the server must be saved as well, or else there would be a gap in pages saved on the server, which shouldn't be allowed.
			// For example, you could have pages 1 to 10 already published, and then add pages 11, 12, and 13. But if you could save page 13 without saving pages 11 and 12, page 13 would be saved on the server with a gap where pages 11 and 12 should be.
			for (const pageValue of Object.values(formikPropsRef.current.values.pages)) {
				if (
					// Check if the page is before this one.
					pageValue.id < page.id
					// Check if the page is not yet on the server.
					&& !(pageValue.id in formikPropsRef.current.initialValues.pages)
				) {
					pageIDsToSave.push(pageValue.id);
					pagesToSave[pageValue.id] = formikPropsRef.current.values.pages[pageValue.id];
					initialPagesToSave[pageValue.id] = formikPropsRef.current.initialValues.pages[pageValue.id];
				}
			}
		}

		if (!reportPageValidity(false, pageIDsToSave)) {
			return;
		}

		const changedValues = getChangedValues(initialPagesToSave, pagesToSave);

		if (!changedValues) {
			return;
		}

		formikPropsRef.current.setSubmitting(true);

		const { data: newPages } = await (api as StoryPagesAPI).put(`/stories/${storyID}/pages`, changedValues as any).catch(error => {
			formikPropsRef.current.setSubmitting(false);

			return Promise.reject(error);
		});

		// Preserve the React keys of updated pages.
		for (const newPage of Object.values(newPages)) {
			(newPage as KeyedClientStoryPage)[_key] = (
				formikPropsRef.current.values.pages[newPage.id] as KeyedClientStoryPage
			)[_key];
		}

		setInitialPages({
			...formikPropsRef.current.initialValues.pages,
			...newPages
		});

		queuedValuesRef.current = {
			pages: {
				...formikPropsRef.current.values.pages,
				...newPages
			}
		};

		formikPropsRef.current.setSubmitting(false);
	}, [onServer, page.id, reportPageValidity, storyID, formikPropsRef, setInitialPages, queuedValuesRef]);

	const publishPage = useCallback(async (event: MouseEvent<HTMLButtonElement & HTMLAnchorElement>) => {
		formikPropsRef.current.setSubmitting(true);

		/** The `published` value to set on the pages. */
		let published = Date.now();

		if (!event.shiftKey) {
			const dialog = new Dialog({
				id: 'publish-pages',
				title: 'Publish Pages',
				initialValues: {
					action: 'publish' as 'publish' | 'schedule',
					date: '' as DateNumber | ''
				},
				content: ({ values }) => (
					<>
						<Row>
							{`What would you like to do with ${
								firstDraftID === page.id
									? `page ${page.id}`
									: `pages ${firstDraftID} to ${page.id}`
							}?`}
						</Row>
						<Row id="field-container-action">
							<Field
								type="radio"
								id="field-action-publish"
								name="action"
								value="publish"
							/>
							<label htmlFor="field-action-publish">
								Publish Now
							</label>
							<Field
								type="radio"
								id="field-action-schedule"
								name="action"
								value="schedule"
							/>
							<label htmlFor="field-action-schedule">
								Schedule for Later
							</label>
							{values.action === 'schedule' && (
								<>
									<div id="field-container-date">
										<DateField
											name="date"
											withTime
											required
											min={Date.now() + 1000 * 60}
											max={Date.now() + 1000 * 60 * 60 * 24 * 365}
											defaultYear={new Date().getFullYear()}
											defaultMonth={new Date().getMonth()}
											defaultDay={new Date().getDate()}
										/>
									</div>
									{typeof values.date === 'number' && (
										<Timestamp relative withTime>
											{values.date}
										</Timestamp>
									)}
								</>
							)}
						</Row>
						{
							// To reduce clutter, only show the tip on the default `action` setting.
							values.action === 'publish' && (
								<Row id="publish-tip">
									Tip: Shift+click the publish button to bypass this dialog and publish immediately.
								</Row>
							)
						}
					</>
				),
				actions: ['Submit', 'Cancel']
			});

			if (!(await dialog)?.submit) {
				formikPropsRef.current.setSubmitting(false);
				return;
			}

			published = (
				dialog.form!.values.action === 'schedule'
					&& typeof dialog.form!.values.date === 'number'
					? dialog.form!.values.date
					: Date.now()
			);
		}

		const pageChanges: Record<string, RecursivePartial<ClientStoryPage>> = {};

		for (let pageID = firstDraftID!; pageID <= page.id; pageID++) {
			// Check if any of the drafts to be published are unsaved.
			if (!isEqual(formikPropsRef.current.values.pages[pageID], formikPropsRef.current.initialValues.pages[pageID])) {
				new Dialog({
					id: 'publish-pages',
					title: 'Publish Pages',
					content: `Page ${pageID} has unsaved changes. Any pages being published must first be saved.`
				});

				formikPropsRef.current.setSubmitting(false);
				return;
			}

			// Set this draft to be published.
			pageChanges[pageID] = { published };
		}

		const { data: newPages } = await (api as StoryPagesAPI).put(`/stories/${storyID}/pages`, pageChanges).catch(error => {
			formikPropsRef.current.setSubmitting(false);

			return Promise.reject(error);
		});

		// Preserve the React keys of updated pages.
		for (const newPage of Object.values(newPages)) {
			(newPage as KeyedClientStoryPage)[_key] = (
				formikPropsRef.current.values.pages[newPage.id] as KeyedClientStoryPage
			)[_key];
		}

		setInitialPages({
			...formikPropsRef.current.initialValues.pages,
			...newPages
		});

		queuedValuesRef.current = {
			pages: {
				...formikPropsRef.current.values.pages,
				...newPages
			}
		};

		formikPropsRef.current.setSubmitting(false);
	}, [firstDraftID, page.id, storyID, setInitialPages, queuedValuesRef, formikPropsRef]);

	const deletePage = useCallback(async () => {
		formikPropsRef.current.setSubmitting(true);

		if (!await Dialog.confirm({
			id: 'delete-pages',
			title: 'Delete Page',
			content: `Are you sure you want to delete page ${page.id}?\n\nThis cannot be undone.`
		})) {
			formikPropsRef.current.setSubmitting(false);
			return;
		}

		// Delete the page on the client.
		const newPages = deleteFromClientStoryPageRecord(page.id, formikPropsRef.current.values.pages);

		if (onServer) {
			// Delete the page on the server.
			await (api as StoryPageAPI).delete(`/stories/${storyID}/pages/${page.id}`).catch(error => {
				formikPropsRef.current.setSubmitting(false);

				return Promise.reject(error);
			});

			// Delete the page in the initial values.
			setInitialPages(
				deleteFromClientStoryPageRecord(page.id, formikPropsRef.current.initialValues.pages)
			);

			// Queue the `newPages` to be set into the Formik values.
			queuedValuesRef.current = { pages: newPages };
		} else {
			// Set the `newPages` into the Formik values.
			formikPropsRef.current.setFieldValue('pages', newPages);
		}

		// Delete this page's cached height.
		delete cachedPageHeightsRef.current[page[_key]];

		formikPropsRef.current.setSubmitting(false);
	}, [formikPropsRef, page, onServer, storyID, setInitialPages, queuedValuesRef, cachedPageHeightsRef]);

	return (
		<BoxSection
			id={`p${page.id}`}
			className={`story-editor-page ${pageStatus}${saved ? ' saved' : ''}`}
			heading={(
				<>
					<span className="story-editor-page-id spaced">
						{page.id}
					</span>
					<span className="story-editor-page-status spaced">
						{pageStatus === 'draft' ? 'Draft' : (
							<>
								{
									`${pageStatus === 'published'
										? 'Published'
										: 'Scheduled'
									} `
								}
								<Timestamp short withTime>
									{initialPublished!}
								</Timestamp>
							</>
						)}
					</span>
				</>
			)}
			style={{
				// Even if `marginTop === 0`, we still set it in order to discourage custom CSS from overwriting it, as doing so would interfere with culling.
				marginTop: `${marginTop}px`
			}}
			ref={ref}
		>
			<Row className="page-field-container-title">
				<Label
					block
					htmlFor={`field-pages-${page.id}-title`}
					help="The text displayed at the top of this page. This text also appears in any link to this page from the commands at the bottom of another page."
				>
					Page Title/Command
				</Label>
				<Field
					id={`field-pages-${page.id}-title`}
					name={`pages.${page.id}.title`}
					maxLength={500}
					autoComplete="off"
				/>
			</Row>
			<Row className="page-field-container-content">
				<Label block htmlFor={`field-pages-${page.id}-content`}>
					Content
				</Label>
				<BBField
					name={`pages.${page.id}.content`}
					rows={6}
					html
				/>
			</Row>
			<Row className="story-editor-page-show-advanced-link-container">
				<Link className="translucent-text" onClick={toggleAdvanced}>
					{advancedShown ? 'Hide Advanced Options' : 'Show Advanced Options'}
				</Link>
			</Row>
			{advancedShown && (
				<Row className="story-editor-page-advanced">
					<Row className="page-field-columns">
						<div className="page-field-container-next-pages">
							<Label
								block
								help={'The page numbers of the commands to link at the bottom of this page (in order). By default, each newly added page will already link to the page after it.\n\nThis is particularly useful for skipping hidden pages or adding multiple page links in branching stories.'}
							>
								Next Pages
							</Label>
							<div className="story-editor-next-page-container">
								{page.nextPages.map((pageID, nextPageIndex) => (
									<div
										key={nextPageIndex}
										className="story-editor-next-page"
									>
										<Field
											type="number"
											name={`pages.${page.id}.nextPages.${nextPageIndex}`}
											className="story-editor-next-page-input spaced"
											min={1}
											required
											innerRef={
												nextPageIndex === page.nextPages.length - 1
													? lastNextPageInputRef
													: undefined
											}
										/>
										<RemoveButton
											className="spaced"
											title="Remove Page"
											onClick={removeNextPage}
										/>
									</div>
								))}
								<div>
									<AddButton
										title="Add Page"
										onClick={addNextPage}
									/>
								</div>
							</div>
						</div>
						<InlineRowSection className="page-field-container-misc">
							{page.id !== 1 && (
								<FieldBoxRow
									type="checkbox"
									name={`pages.${page.id}.unlisted`}
									label="Unlisted"
									help="Unlisted pages are not included in new update notifications and do not show in your adventure's log. Comments on an unlisted page will not appear under any other page."
								/>
							)}
							<FieldBoxRow
								type="checkbox"
								name={`pages.${page.id}.disableControls`}
								label="Disable Controls"
								help={'Disallows users from using MSPFA\'s controls on this page (e.g. left and right arrow keys to navigate between pages).\n\nIt\'s generally only necessary to disable controls if a script or embedded game has custom controls conflicting with MSPFA\'s.'}
							/>
						</InlineRowSection>
					</Row>
					<Row className="page-field-container-content">
						<Label
							block
							htmlFor={`field-pages-${page.id}-commentary`}
							help={'You can detail your thoughts about this page here. Readers viewing this page will be able to open your commentary and view what you wrote.\n\nBBCode is allowed here, but authors usually only use plain text for their commentary.'}
						>
							Commentary
						</Label>
						<Field
							as="textarea"
							id={`field-pages-${page.id}-commentary`}
							name={`pages.${page.id}.commentary`}
							rows={3}
						/>
					</Row>
				</Row>
			)}
			<Row className="story-editor-page-actions">
				{saved ? (
					<>
						<Button
							href={`/s/${storyID}/p/${page.id}?preview=1`}
							target="_blank"
							disabled={isSubmitting}
						>
							Preview
						</Button>
						{pageStatus === 'draft' && (
							<Button
								disabled={isSubmitting}
								title={
									firstDraftID === page.id
										? `Publish Page ${page.id}`
										: `Publish Pages ${firstDraftID} to ${page.id}`
								}
								onClick={publishPage}
							>
								{(firstDraftID === page.id
									? 'Publish'
									: `Publish p${firstDraftID}-${page.id}`
								)}
							</Button>
						)}
					</>
				) : (
					<Button
						disabled={isSubmitting}
						onClick={savePage}
					>
						{(pageStatus === 'draft'
						// The reason this should say "Save Draft" instead of "Save" for drafts is because "Save" would be ambiguous with "Publish", making users more hesitant to click it if they aren't ready to publish yet.
							? 'Save Draft'
							: 'Save'
						)}
					</Button>
				)}
				<Button
					disabled={isSubmitting}
					onClick={deletePage}
				>
					Delete
				</Button>
			</Row>
		</BoxSection>
	);
});

export default StoryEditorPageListing;