import './styles.module.scss';
import BoxSection from 'components/Box/BoxSection';
import type { ClientStoryPage, ClientStoryPageRecord } from 'modules/client/stories';
import type { FormikProps } from 'formik';
import { Field } from 'formik';
import Label from 'components/Label';
import BBField from 'components/BBCode/BBField';
import type { Dispatch, MouseEvent, MutableRefObject, RefObject, SetStateAction } from 'react';
import React, { useCallback, useRef, useState } from 'react';
import AddButton from 'components/Button/AddButton';
import type { KeyedClientStoryPage, Values } from 'pages/s/[storyID]/edit/p';
import { _key } from 'pages/s/[storyID]/edit/p';
import RemoveButton from 'components/Button/RemoveButton';
import { isEqual } from 'lodash';
import Timestamp from 'components/Timestamp';
import InlineRowSection from 'components/Box/InlineRowSection';
import FieldBoxRow from 'components/Box/FieldBoxRow';
import Button from 'components/Button';
import type { StoryID, StoryPageID } from 'modules/server/stories';
import { Dialog } from 'modules/client/dialogs';
import Row from 'components/Row';
import Link from 'components/Link';
import type { APIClient } from 'modules/client/api';
import api from 'modules/client/api';
import { getChangedValues } from 'modules/client/forms';

type StoryPagesAPI = APIClient<typeof import('pages/api/stories/[storyID]/pages').default>;
type StoryPageAPI = APIClient<typeof import('pages/api/stories/[storyID]/pages/[pageID]').default>;

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

export type StoryEditorPageProps = {
	/** The `ClientStoryPage` being edited. */
	children: ClientStoryPage,
	storyID: StoryID,
	/** This page's `published` value in the `initialValues`. */
	initialPublished: number | undefined,
	firstDraftID: StoryPageID | undefined,
	formikPropsRef: MutableRefObject<FormikProps<Values>>,
	setInitialPages: Dispatch<SetStateAction<ClientStoryPageRecord>>,
	queuedValuesRef: MutableRefObject<Values | undefined>,
	/** Whether the form is loading. */
	isSubmitting: boolean,
	/** A ref to the first page field's title `input` element. */
	firstTitleInputRef?: RefObject<HTMLInputElement>
};

/** A `BoxSection` for a page in the story editor. */
const StoryEditorPage = React.memo(({
	children: page,
	storyID,
	initialPublished,
	firstDraftID,
	formikPropsRef,
	setInitialPages,
	queuedValuesRef,
	isSubmitting,
	firstTitleInputRef
}: StoryEditorPageProps) => {
	/** Whether this page exists on the server. */
	const onServer = page.id in formikPropsRef.current.initialValues.pages;

	/** Whether this page exists on the server and has the same values as on the server. */
	const saved = onServer && isEqual(page, formikPropsRef.current.initialValues.pages[page.id]);

	const pageStatus = (
		initialPublished === undefined
			? 'draft' as const
			: initialPublished < Date.now()
				? 'scheduled' as const
				: 'published' as const
	);

	const sectionRef = useRef<HTMLDivElement>(null!);

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

	/** Reports the validity of all form elements in this page section. If one of them is found invalid, stops reporting and returns `false`. If all elements are valid, returns `true`. */
	const reportPageValidity = useCallback((
		/** Whether to only check the validity of advanced options. */
		onlyAdvanced = false,
		/** The IDs of pages to report the validity of. */
		pageIDs?: StoryPageID[]
	) => {
		let selectors = ['input', 'textarea', 'select'];

		if (onlyAdvanced) {
			selectors = selectors.map(selector => `.story-editor-page-advanced ${selector}`);
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
			selectors = selectors.flatMap(selector => (
				pageIDs!.map(pageID => `#story-editor-page-section-${pageID} ${selector}`)
			));
		}

		const container = pageIDs ? sectionRef.current.parentNode! : sectionRef.current;

		for (const element of container.querySelectorAll<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>(selectors.join(', '))) {
			if (!element.reportValidity()) {
				return false;
			}
		}

		return true;
	}, [page.id]);

	const [advancedShown, setAdvancedShown] = useState(false);

	const toggleAdvanced = useCallback(() => {
		if (advancedShown && !reportPageValidity(true)) {
			// Don't let the advanced section be hidden if it contains invalid fields.
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

		const { data: newPages } = await (api as StoryPagesAPI).put(`/stories/${storyID}/pages`, changedValues as any);

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
	}, [onServer, page.id, reportPageValidity, storyID, formikPropsRef, setInitialPages, queuedValuesRef]);

	const publishPage = useCallback(() => {
		if (!reportPageValidity()) {
			return;
		}

		console.log('publish!');
	}, [reportPageValidity]);

	return (
		<BoxSection
			id={`story-editor-page-section-${page.id}`}
			className={`story-editor-page-section${saved ? ' saved' : ''} ${pageStatus}`}
			heading={
				pageStatus === 'draft'
					// These are two separate templates in order to avoid React inserting unnecessary comments between text nodes in the HTML sent from the server.
					? `Page ${page.id} (Draft)`
					: (
						<>
							{
								`Page ${page.id} (${
									pageStatus === 'published'
										? 'Published'
										: 'Scheduled'
								} `
							}
							<Timestamp short withTime>
								{initialPublished!}
							</Timestamp>
							)
						</>
					)
			}
			ref={sectionRef}
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
					innerRef={firstTitleInputRef}
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
						<Button
							disabled={isSubmitting}
							onClick={publishPage}
						>
							{(firstDraftID === page.id
								? 'Publish'
								: `Publish p${firstDraftID}-${page.id}`
							)}
						</Button>
					</>
				) : (
					<Button
						disabled={isSubmitting}
						onClick={savePage}
					>
						{pageStatus === 'draft' ? 'Save Draft' : 'Save'}
					</Button>
				)}
				<Button
					disabled={isSubmitting}
					onClick={
						useCallback(async () => {
							// Set `isSubmitting` to `true` so the form cannot be significantly modified while deletion is in progress and cause race conditions in this callback.
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

							formikPropsRef.current.setSubmitting(false);
						}, [formikPropsRef, page.id, onServer, storyID, setInitialPages, queuedValuesRef])
					}
				>
					Delete
				</Button>
			</Row>
		</BoxSection>
	);
});

export default StoryEditorPage;