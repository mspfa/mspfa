import './styles.module.scss';
import BoxSection from 'components/Box/BoxSection';
import type { ClientStoryPage } from 'modules/client/stories';
import { Field, useFormikContext } from 'formik';
import Label from 'components/Label';
import BBField from 'components/BBCode/BBField';
import type { MouseEvent, RefObject } from 'react';
import { useCallback, useRef } from 'react';
import AddButton from 'components/Button/AddButton';
import type { Values } from 'pages/s/[storyID]/edit/p';
import RemoveButton from 'components/Button/RemoveButton';
import { isEqual } from 'lodash';
import Timestamp from 'components/Timestamp';
import InlineRowSection from 'components/Box/InlineRowSection';
import FieldBoxRow from 'components/Box/FieldBoxRow';

export type StoryEditorPageProps = {
	/** The `ClientStoryPage` being edited. */
	children: ClientStoryPage,
	/** The index of this page within the `pages` Formik value. */
	pageIndex: number,
	/** A ref to the first page field's title `input` element. */
	firstTitleInputRef: RefObject<HTMLInputElement>
};

const StoryEditorPage = ({
	children: page,
	pageIndex,
	firstTitleInputRef
}: StoryEditorPageProps) => {
	const { setFieldValue, initialValues } = useFormikContext<Values>();

	const onClickRemoveNextPage = useCallback((event: MouseEvent<HTMLButtonElement & HTMLAnchorElement> & { target: HTMLButtonElement }) => {
		// The `parentNode` of this `RemoveButton` will be the `div.story-editor-next-page` element.
		const nextPageElement = event.target.parentNode as HTMLDivElement;

		/** The index of the value in `page.nextPages` being removed, equal to the index of the `nextPageElement` in its parent `div.story-editor-next-page-container` element. */
		const nextPageIndex = Array.prototype.indexOf.call(nextPageElement.parentNode!.childNodes, nextPageElement);

		setFieldValue(`pages.${pageIndex}.nextPages`, [
			...page.nextPages.slice(0, nextPageIndex),
			...page.nextPages.slice(nextPageIndex + 1, page.nextPages.length)
		]);
	}, [setFieldValue, pageIndex, page.nextPages]);

	const lastNextPageInputRef = useRef<HTMLInputElement>(null);

	const saved = isEqual(page, initialValues.pages.find(({ id }) => id === page.id));

	const pageStatus = (
		page.published === undefined
			? 'draft' as const
			: page.published < Date.now()
				? 'scheduled' as const
				: 'published' as const
	);

	return (
		<BoxSection
			className={`story-editor-page${saved ? ' saved' : ''} ${pageStatus}`}
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
		>
			<div className="page-field-container-title">
				<Label
					block
					htmlFor={`field-pages-${pageIndex}-title`}
					help="The text displayed at the top of this page. This text also appears in any link to this page from the commands at the bottom of another page."
				>
					Page Title/Command
				</Label>
				<Field
					id={`field-pages-${pageIndex}-title`}
					name={`pages.${pageIndex}.title`}
					required
					maxLength={500}
					autoComplete="off"
					innerRef={
						pageIndex === 0
							? firstTitleInputRef
							: undefined
					}
				/>
			</div>
			<div className="page-field-container-content">
				<Label block htmlFor={`field-pages-${pageIndex}-content`}>
					Content
				</Label>
				<BBField
					name={`pages.${pageIndex}.content`}
					rows={6}
					html
				/>
			</div>
			<div className="page-field-columns">
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
								<label className="spaced">
									<Field
										type="number"
										name={`pages.${pageIndex}.nextPages.${nextPageIndex}`}
										className="story-editor-next-page-input"
										min={1}
										required
										innerRef={
											nextPageIndex === page.nextPages.length - 1
												? lastNextPageInputRef
												: undefined
										}
									/>
								</label>
								<RemoveButton
									className="spaced"
									title="Remove Page"
									onClick={onClickRemoveNextPage}
								/>
							</div>
						))}
					</div>
					<AddButton
						title="Add Page"
						onClick={
							useCallback(() => {
								setFieldValue(`pages.${pageIndex}.nextPages`, [
									...page.nextPages,
									''
								]);

								// Wait for the newly added next page to render.
								setTimeout(() => {
									lastNextPageInputRef.current?.focus();
								});
							}, [setFieldValue, pageIndex, page.nextPages])
						}
					/>
				</div>
				<InlineRowSection className="page-field-container-misc">
					{page.id !== 1 && (
						<FieldBoxRow
							type="checkbox"
							name={`pages.${pageIndex}.unlisted`}
							label="Unlisted"
							help="Unlisted pages are not included in new update notifications and do not show in your adventure's log. Comments on an unlisted page will not appear under any other page."
						/>
					)}
					<FieldBoxRow
						type="checkbox"
						name={`pages.${pageIndex}.disableControls`}
						label="Disable Controls"
						help={'Disallows users from using MSPFA\'s controls on this page (e.g. left and right arrow keys to navigate between pages).\n\nIt\'s generally only necessary to disable controls if a script or embedded game has custom controls which conflict with MSPFA\'s.'}
					/>
				</InlineRowSection>
			</div>
		</BoxSection>
	);
};

export default StoryEditorPage;