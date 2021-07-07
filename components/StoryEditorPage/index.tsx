import './styles.module.scss';
import BoxSection from 'components/Box/BoxSection';
import type { ClientStoryPage } from 'modules/client/stories';
import { Field, useFormikContext } from 'formik';
import Label from 'components/Label';
import BBField from 'components/BBCode/BBField';
import type { MouseEvent, RefObject } from 'react';
import { useCallback } from 'react';
import AddButton from 'components/Button/AddButton';
import type { Values } from 'pages/s/[storyID]/edit/p';
import RemoveButton from 'components/Button/RemoveButton';

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
	const { setFieldValue } = useFormikContext<Values>();

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

	return (
		<BoxSection
			className="story-editor-page"
			heading={`Page ${page.id}`}
		>
			<div className="page-field single-line">
				<Label
					className="spaced"
					htmlFor={`field-pages-${pageIndex}-title`}
				>
					Title
				</Label>
				<Field
					name={`pages.${pageIndex}.title`}
					className="spaced"
					required
					maxLength={500}
					autoComplete="off"
					innerRef={firstTitleInputRef}
				/>
			</div>
			<div className="page-field">
				<Label htmlFor={`field-pages-${pageIndex}-content`}>
					Content
				</Label>
				<BBField
					name={`pages.${pageIndex}.content`}
					rows={6}
				/>
			</div>
			<div className="page-field">
				<Label help="The page numbers of pages to link at the bottom of this page (in order).">
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
						}, [setFieldValue, pageIndex, page.nextPages])
					}
				/>
			</div>
		</BoxSection>
	);
};

export default StoryEditorPage;