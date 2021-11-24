import './styles.module.scss';
import Button from 'components/Button';
import type { ReactNode, RefObject } from 'react';
import { useContext } from 'react';
import { StoryEditorContext } from 'components/StoryEditor';
import useFunction from 'lib/client/reactHooks/useFunction';
import type { ClientStoryPage, PrivateStory } from 'lib/client/stories';

export type StoryEditorPageListProps = {
	pagesActionsElementRef: RefObject<HTMLDivElement>,
	story: PrivateStory,
	pageComponents: ReactNode[]
};

const StoryEditorPageList = ({ pagesActionsElementRef, story, pageComponents }: StoryEditorPageListProps) => {
	const { formikPropsRef } = useContext(StoryEditorContext)!;

	return (
		<>
			<div
				id="story-editor-pages-actions"
				className="mid"
				ref={pagesActionsElementRef}
			>
				<Button id="story-editor-back-to-top" href="#">
					Back to Top
				</Button>
				<Button
					disabled={formikPropsRef.current.isSubmitting}
					onClick={
						useFunction(() => {
							const pages = Object.values(formikPropsRef.current.values.pages);

							// Get the ID of a new page being added after the last one.
							const id = (
								pages.length
									? +pages[pages.length - 1].id + 1
									: 1
							);

							const newPage: ClientStoryPage = {
								id,
								title: story[
									id === 1
										// Page 1's title should default to the story's title instead of the general default page title.
										? 'title'
										: 'defaultPageTitle'
								],
								content: '',
								nextPages: [id + 1],
								unlisted: false,
								disableControls: false,
								commentary: '',
								silent: false
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
						})
					}
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
			<div id="story-editor-pages" className="view-mode-list">
				{pageComponents}
			</div>
		</>
	);
};

export default StoryEditorPageList;