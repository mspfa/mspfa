import './styles.module.scss';
import BoxSection from 'components/Box/BoxSection';
import type { ClientStoryPage } from 'modules/client/stories';
import type { FormikProps } from 'formik';
import { Field } from 'formik';
import Label from 'components/Label';
import BBField from 'components/BBCode/BBField';
import type { MouseEvent, MutableRefObject, RefObject } from 'react';
import React, { useCallback, useRef, useState } from 'react';
import AddButton from 'components/Button/AddButton';
import type { Values } from 'pages/s/[storyID]/edit/p';
import RemoveButton from 'components/Button/RemoveButton';
import { isEqual } from 'lodash';
import Timestamp from 'components/Timestamp';
import InlineRowSection from 'components/Box/InlineRowSection';
import FieldBoxRow from 'components/Box/FieldBoxRow';
import Button from 'components/Button';
import type { StoryID } from 'modules/server/stories';
import { Dialog } from 'modules/client/dialogs';
import Row from 'components/Row';
import Link from 'components/Link';

export type StoryEditorPageProps = {
	/** The `ClientStoryPage` being edited. */
	children: ClientStoryPage,
	storyID: StoryID,
	formikPropsRef: MutableRefObject<FormikProps<Values>>,
	/** Whether the form is loading. */
	isSubmitting: boolean,
	/** A ref to the first page field's title `input` element. */
	firstTitleInputRef?: RefObject<HTMLInputElement>
};

/** A `BoxSection` for a page in the story editor. */
const StoryEditorPage = React.memo<StoryEditorPageProps>(({
	children: page,
	storyID,
	formikPropsRef,
	isSubmitting,
	firstTitleInputRef
}) => {
	/** Whether this page exists on the server. */
	const onServer = page.id in formikPropsRef.current.initialValues.pages;

	/** Whether this page exists on the server and has the same values as on the server. */
	const saved = onServer && isEqual(page, formikPropsRef.current.initialValues.pages[page.id]);

	const pageStatus = (
		page.published === undefined
			? 'draft' as const
			: page.published < Date.now()
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
		onlyAdvanced = false
	) => {
		// TODO: Handle invalid fields which are unmounted due to `advancedShown === false`.

		let selectors = ['input', 'textarea', 'select'];

		if (onlyAdvanced) {
			selectors = selectors.map(selector => `.story-editor-page-show-advanced-link-container ~ * ${selector}`);
		}

		for (const element of sectionRef.current.querySelectorAll<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>(selectors.join(', '))) {
			if (!element.reportValidity()) {
				return false;
			}
		}

		return true;
	}, []);

	const [advancedShown, setAdvancedShown] = useState(false);

	const toggleAdvanced = useCallback(() => {
		if (advancedShown && !reportPageValidity(true)) {
			// Don't let the advanced section be hidden if it contains invalid fields.
			return;
		}

		setAdvancedShown(advancedShown => !advancedShown);
	}, [advancedShown, reportPageValidity]);

	const savePage = useCallback(() => {
		if (!reportPageValidity()) {
			return;
		}

		console.log('save!');
	}, [reportPageValidity]);

	const publishPage = useCallback(() => {
		if (!reportPageValidity()) {
			return;
		}

		console.log('publish!');
	}, [reportPageValidity]);

	return (
		<BoxSection
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
								{page.published!}
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
					required
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
				<>
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
				</>
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
							Publish
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

							if (onServer) {
								// Delete the page on the server.

								// TODO
							}

							// Delete the page on the client.

							const newPages: Values['pages'] = {};

							for (const pageIDString in formikPropsRef.current.values.pages) {
								const pageID = +pageIDString;

								if (pageID === page.id) {
									// Skip the page being deleted.
									continue;
								}

								const newPage = {
									...formikPropsRef.current.values.pages[pageID]
								};

								// Adjust IDs of pages after the deleted page.
								if (pageID > page.id) {
									newPage.id--;
								}

								// Adjust `nextPages` IDs of pages after the deleted page.
								for (let i = 0; i < newPage.nextPages.length; i++) {
									if (newPage.nextPages[i] > page.id) {
										newPage.nextPages[i]--;
									}
								}

								newPages[newPage.id] = newPage;
							}

							formikPropsRef.current.setFieldValue('pages', newPages);

							formikPropsRef.current.setSubmitting(false);
						}, [formikPropsRef, page.id, onServer])
					}
				>
					Delete
				</Button>
			</Row>
		</BoxSection>
	);
});

export default StoryEditorPage;