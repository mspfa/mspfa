import './styles.module.scss';
import Section from 'components/Section';
import type { ClientStoryPage, ClientStoryPageRecord } from 'lib/client/stories';
import deleteFromClientStoryPageRecord from 'lib/client/deleteFromClientStoryPageRecord';
import { Field } from 'formik';
import Label from 'components/Label';
import BBField from 'components/BBCode/BBField';
import type { MouseEvent } from 'react';
import React, { useRef, useState, useEffect, useContext } from 'react';
import useFunction from 'lib/client/reactHooks/useFunction';
import AddButton from 'components/Button/AddButton';
import type { KeyedClientStoryPage } from 'components/StoryEditor';
import { StoryEditorContext, _key } from 'components/StoryEditor';
import RemoveButton from 'components/Button/RemoveButton';
import { isEqual } from 'lodash';
import Timestamp from 'components/Timestamp';
import LabeledGrid from 'components/LabeledGrid';
import LabeledGridField from 'components/LabeledGrid/LabeledGridField';
import Button from 'components/Button';
import type { StoryPageID } from 'lib/server/stories';
import Dialog from 'lib/client/Dialog';
import Row from 'components/Row';
import Link from 'components/Link';
import type { APIClient } from 'lib/client/api';
import api from 'lib/client/api';
import { getChangedValues } from 'lib/client/forms';
import type { DateNumber, RecursivePartial } from 'lib/types';
import DateField from 'components/DateField';
import useLatest from 'lib/client/reactHooks/useLatest';
import IDPrefix from 'lib/client/reactContexts/IDPrefix';

type StoryPagesAPI = APIClient<typeof import('pages/api/stories/[storyID]/pages').default>;

/** The maximum duration accepted by `setTimeout`. */
const MAX_TIMEOUT = 2147483647;

// DO NOT add a `children` prop to this component unless practical. It is noticeably less performant than other props.
export type StoryEditorPageListingProps = {
	/** The number of pixels to be added to this element's `style.marginTop` for holding the place of all consecutive culled page listings above this one. */
	marginTop: number,
	/** The `ClientStoryPage` being edited. */
	page: KeyedClientStoryPage,
	/** This page's `published` value in the `initialValues`. */
	initialPublished: DateNumber | undefined,
	/** Whether this page's advanced section is toggled open. */
	advancedShown?: boolean
};

/** A `Section` for a page in the story editor when in the list view mode. */
const StoryEditorPageListing = React.memo(({
	marginTop,
	page,
	initialPublished,
	advancedShown
}: StoryEditorPageListingProps) => {
	const {
		storyID,
		firstDraftID,
		lastNonDraftID,
		formikPropsRef,
		setInitialPages,
		queuedValuesRef,
		isSubmitting,
		cachedPageHeightsRef,
		toggleAdvancedShown
	} = useContext(StoryEditorContext)!;

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

	const removeNextPage = useFunction((event: MouseEvent<HTMLButtonElement & HTMLAnchorElement> & { target: HTMLButtonElement }) => {
		// The `parentNode` of this `RemoveButton` will be the `div.story-editor-next-page` element.
		const nextPageElement = event.target.parentNode as HTMLDivElement;

		/** The index of the value in `page.nextPages` being removed, equal to the index of the `nextPageElement` in its parent `div.story-editor-next-page-container` element. */
		const nextPageIndex = Array.prototype.indexOf.call(nextPageElement.parentNode!.childNodes, nextPageElement);

		formikPropsRef.current.setFieldValue(`pages.${page.id}.nextPages`, [
			...page.nextPages.slice(0, nextPageIndex),
			...page.nextPages.slice(nextPageIndex + 1, page.nextPages.length)
		]);
	});

	const addNextPage = useFunction(() => {
		formikPropsRef.current.setFieldValue(`pages.${page.id}.nextPages`, [
			...page.nextPages,
			''
		]);

		// Wait for the newly added next page to render.
		setTimeout(() => {
			lastNextPageInputRef.current?.focus();
		});
	});

	const lastNextPageInputRef = useRef<HTMLInputElement>(null);

	/** If an invalid element is found in this page listing, reports its validity and returns `false`. Otherwise, returns `true`. */
	const reportPageValidity = useFunction((
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
	});

	const togglePageAdvancedShown = useFunction(() => {
		if (advancedShown && !reportPageValidity(true)) {
			// Don't let the advanced section be hidden if it contains invalid fields, or else the invalid fields wouldn't be detectable.
			return;
		}

		toggleAdvancedShown(page[_key]);
	});

	const savePage = useFunction(async () => {
		/** The IDs of pages to save. */
		const pageIDsToSave: StoryPageID[] = [page.id];

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

		const { data: newInitialPages } = await (api as StoryPagesAPI).patch(`/stories/${storyID}/pages`, changedValues as any).catch(error => {
			formikPropsRef.current.setSubmitting(false);

			return Promise.reject(error);
		});

		// Preserve the React keys of updated pages.
		for (const newInitialPage of Object.values(newInitialPages)) {
			(newInitialPage as KeyedClientStoryPage)[_key] = (
				formikPropsRef.current.values.pages[newInitialPage.id] as KeyedClientStoryPage
			)[_key];
		}

		setInitialPages({
			...formikPropsRef.current.initialValues.pages,
			...newInitialPages
		});

		queuedValuesRef.current = {
			pages: {
				...formikPropsRef.current.values.pages,
				...newInitialPages
			}
		};

		formikPropsRef.current.setSubmitting(false);
	});

	const publishPage = useFunction(async (event: MouseEvent<HTMLButtonElement & HTMLAnchorElement>) => {
		formikPropsRef.current.setSubmitting(true);

		// Ensure that none of the drafts to be published are unsaved.
		for (let pageID = firstDraftID!; pageID <= page.id; pageID++) {
			if (!isEqual(formikPropsRef.current.values.pages[pageID], formikPropsRef.current.initialValues.pages[pageID])) {
				new Dialog({
					id: 'publish-pages',
					title: 'Publish Pages',
					content: `Page ${pageID} has unsaved changes. Any pages being published must first be saved.`
				});

				formikPropsRef.current.setSubmitting(false);
				return;
			}
		}

		/** The `published` value to be set on the pages. */
		let published = Date.now();
		/** The `silent` value to be set on the pages. */
		let silent;

		if (!event.shiftKey) {
			const minDate = Math.max(
				// One minute from now.
				Date.now() + 1000 * 60,
				firstDraftID! === 1
					// If the first page being published is page 1, then there should be no other minimum `published` date.
					? -Infinity
					// The `published` date of the previous page.
					: formikPropsRef.current.values.pages[firstDraftID! - 1].published!
			);

			const dialog = new Dialog({
				id: 'publish-pages',
				title: 'Publish Pages',
				initialValues: {
					action: 'publish' as 'publish' | 'schedule',
					date: '' as DateNumber | '',
					silent: false
				},
				content: ({ values }) => (
					<IDPrefix.Provider value="story-page-publish">
						<Row>
							{`What would you like to do with ${
								firstDraftID! === page.id
									? `p${page.id}`
									: `p${firstDraftID!}-${page.id}`
							}?`}
						</Row>
						<Row id="story-page-publish-field-container-action">
							<Field
								type="radio"
								id="story-page-publish-field-action-publish"
								name="action"
								value="publish"
							/>
							<label htmlFor="story-page-publish-field-action-publish">
								Publish Now
							</label>
							<Field
								type="radio"
								id="story-page-publish-field-action-schedule"
								name="action"
								value="schedule"
							/>
							<label htmlFor="story-page-publish-field-action-schedule">
								Schedule for Later
							</label>
							{values.action === 'schedule' && (
								<>
									<div id="story-page-publish-field-container-date">
										<DateField
											name="date"
											withTime
											required
											min={minDate}
											max={Date.now() + 1000 * 60 * 60 * 24 * 365}
											defaultYear={new Date(minDate).getFullYear()}
											defaultMonth={new Date(minDate).getMonth()}
											defaultDay={new Date(minDate).getDate()}
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
						<LabeledGrid>
							<LabeledGridField
								type="checkbox"
								name="silent"
								label="Update Silently"
								help={'Prevents this update from notifying your readers, and prevents the adventure from appearing at the front of the recently updated adventure list.\n\nNote that pages set as unlisted always update silently either way.\n\nAdditionally, if your adventure is unlisted or private, it will not publicly appear under any list no matter what.'}
							/>
						</LabeledGrid>
						{/* To reduce clutter, only show the tip on the default `action` setting. */}
						{values.action === 'publish' && (
							<Row id="story-page-publish-tip">
								Tip: Shift+click the publish button to bypass this dialog and publish immediately.
							</Row>
						)}
					</IDPrefix.Provider>
				),
				actions: ['Submit!', 'Cancel']
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

			({ silent } = dialog.form!.values);
		}

		const pageChanges: Record<StoryPageID, RecursivePartial<ClientStoryPage>> = {};

		// Set each draft's `published` and `silent` values.
		for (let pageID = firstDraftID!; pageID <= page.id; pageID++) {
			pageChanges[pageID] = { published, silent };
		}

		const { data: newInitialPages } = await (api as StoryPagesAPI).patch(`/stories/${storyID}/pages`, pageChanges).catch(error => {
			formikPropsRef.current.setSubmitting(false);

			return Promise.reject(error);
		});

		// Preserve the React keys of updated pages.
		for (const newInitialPage of Object.values(newInitialPages)) {
			(newInitialPage as KeyedClientStoryPage)[_key] = (
				formikPropsRef.current.values.pages[newInitialPage.id] as KeyedClientStoryPage
			)[_key];
		}

		setInitialPages({
			...formikPropsRef.current.initialValues.pages,
			...newInitialPages
		});

		queuedValuesRef.current = {
			pages: {
				...formikPropsRef.current.values.pages,
				...newInitialPages
			}
		};

		formikPropsRef.current.setSubmitting(false);
	});

	const unpublishPage = useFunction(async () => {
		formikPropsRef.current.setSubmitting(true);

		if (!await Dialog.confirm({
			id: 'unpublish-pages',
			title: `${pageStatus === 'scheduled' ? 'Unschedule' : 'Unpublish'} Pages`,
			content: `Are you sure you want to unpublish ${
				lastNonDraftID === page.id
					? `p${page.id}`
					: `p${page.id}-${lastNonDraftID}`
			}?`
		})) {
			formikPropsRef.current.setSubmitting(false);
			return;
		}

		const pageChanges: Record<StoryPageID, { published: null }> = {};

		const newPages: ClientStoryPageRecord = {};

		for (let pageID = page.id; pageID <= lastNonDraftID!; pageID++) {
			// Set this page to be unpublished for the API request.
			pageChanges[pageID] = { published: null };

			// Set this page to be unpublished for the form values update.
			const newPage = { ...formikPropsRef.current.values.pages[pageID] };
			delete newPage.published;
			newPages[pageID] = newPage;
		}

		const { data: newInitialPages } = await (api as StoryPagesAPI).patch(`/stories/${storyID}/pages`, pageChanges).catch(error => {
			formikPropsRef.current.setSubmitting(false);

			return Promise.reject(error);
		});

		// Preserve the React keys of updated pages.
		for (const newInitialPage of Object.values(newInitialPages)) {
			(newInitialPage as KeyedClientStoryPage)[_key] = (
				formikPropsRef.current.values.pages[newInitialPage.id] as KeyedClientStoryPage
			)[_key];
		}

		setInitialPages({
			...formikPropsRef.current.initialValues.pages,
			...newInitialPages
		});

		queuedValuesRef.current = {
			pages: {
				...formikPropsRef.current.values.pages,
				...newPages
			}
		};

		formikPropsRef.current.setSubmitting(false);
	});

	/** A ref to the latest value of `advancedShown` to avoid race conditions. */
	const advancedShownRef = useLatest(advancedShown);

	const deletePage = useFunction(async () => {
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
			await (api as StoryPagesAPI).delete(`/stories/${storyID}/pages`, {
				data: {
					pageIDs: [page.id]
				}
			}).catch(error => {
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

		// If this page's key is in `advancedShownPageKeys`, delete it therefrom.
		if (advancedShownRef.current) {
			toggleAdvancedShown(page[_key]);
		}

		formikPropsRef.current.setSubmitting(false);
	});

	return (
		<Section
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
								{(pageStatus === 'published' ? 'Published' : 'Scheduled') + ' '}
								<Timestamp short withTime relative>
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
					disabled={isSubmitting}
				/>
			</Row>
			<Row className="page-field-container-content">
				<Label block htmlFor={`field-pages-${page.id}-content`}>
					Content
				</Label>
				<BBField
					name={`pages.${page.id}.content`}
					rows={6}
					keepHTMLTags
					disabled={isSubmitting}
				/>
			</Row>
			<Row className="story-editor-page-toggle-advanced-link-container">
				<Link
					className="story-editor-page-toggle-advanced-link translucent"
					onClick={togglePageAdvancedShown}
				>
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
											disabled={isSubmitting}
											innerRef={
												nextPageIndex === page.nextPages.length - 1
													? lastNextPageInputRef
													: undefined
											}
										/>
										<RemoveButton
											className="spaced"
											title="Remove Page"
											disabled={isSubmitting}
											onClick={removeNextPage}
										/>
									</div>
								))}
								<div>
									<AddButton
										title="Add Page"
										disabled={isSubmitting}
										onClick={addNextPage}
									/>
								</div>
							</div>
						</div>
						<LabeledGrid className="page-field-container-misc">
							{page.id !== 1 && (
								<LabeledGridField
									type="checkbox"
									name={`pages.${page.id}.unlisted`}
									label="Unlisted"
									help="Unlisted pages are not included in new update notifications and do not show in your adventure's log. Comments on an unlisted page will not appear under any other page."
									disabled={isSubmitting}
								/>
							)}
							<LabeledGridField
								type="checkbox"
								name={`pages.${page.id}.disableControls`}
								label="Disable Controls"
								help={'Disallows users from using MSPFA\'s controls on this page (e.g. left and right arrow keys to navigate between pages).\n\nIt\'s generally only necessary to disable controls if a script or embedded game has custom controls conflicting with MSPFA\'s.'}
								disabled={isSubmitting}
							/>
						</LabeledGrid>
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
							disabled={isSubmitting}
						/>
					</Row>
				</Row>
			)}
			<Row className="story-editor-page-actions">
				{saved ? (
					<>
						<Button
							href={`/?s=${storyID}&p=${page.id}${pageStatus === 'published' ? '' : '&preview=1'}`}
							target={pageStatus === 'published' ? undefined : '_blank'}
							disabled={isSubmitting}
						>
							{pageStatus === 'published' ? 'View' : 'Preview'}
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
				{pageStatus !== 'draft' && (
					<Button
						disabled={isSubmitting}
						title={
							(pageStatus === 'scheduled' ? 'Unschedule' : 'Unpublish')
							+ ' '
							+ (
								lastNonDraftID === page.id
									? `Page ${page.id}`
									: `Pages ${page.id} to ${lastNonDraftID}`
							)
						}
						onClick={unpublishPage}
					>
						{
							(pageStatus === 'scheduled' ? 'Unschedule' : 'Unpublish')
							+ ' '
							+ (
								lastNonDraftID === page.id
									? ''
									: ` p${page.id}-${lastNonDraftID}`
							)
						}
					</Button>
				)}
				<Button
					disabled={isSubmitting}
					onClick={deletePage}
				>
					Delete
				</Button>
			</Row>
		</Section>
	);
});

export default StoryEditorPageListing;