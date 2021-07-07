import BoxSection from 'components/Box/BoxSection';
import type { ClientStoryPage } from 'modules/client/stories';
import { Field } from 'formik';
import Label from 'components/Label';
import BBField from 'components/BBCode/BBField';
import type { RefObject } from 'react';

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
}: StoryEditorPageProps) => (
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
			<Label help="The list of pages to link at the bottom of this page.">
				Next Pages
			</Label>
			{page.nextPages.map((pageID, nextPageIndex) => (
				<label
					key={pageIndex}
					className="story-editor-next-page"
				>
					<Field
						type="number"
						name={`pages.${pageIndex}.nextPages.${nextPageIndex}`}
						className="story-editor-next-page-input"
						min={1}
					/>
				</label>
			))}
		</div>
	</BoxSection>
);

export default StoryEditorPage;