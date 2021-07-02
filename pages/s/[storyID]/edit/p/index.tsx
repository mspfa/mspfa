import './styles.module.scss';
import Page from 'components/Page';
import { Perm } from 'modules/client/perms';
import { withErrorPage } from 'modules/client/errors';
import { withStatusCode } from 'modules/server/errors';
import { Form, Formik } from 'formik';
import { Fragment, useCallback, useRef, useState } from 'react';
import { useLeaveConfirmation } from 'modules/client/forms';
import Box from 'components/Box';
import Button from 'components/Button';
import { getPrivateStory, getStoryByUnsafeID } from 'modules/server/stories';
import type { ClientStoryPage, PrivateStory } from 'modules/client/stories';
import BoxSection from 'components/Box/BoxSection';
import type { APIClient } from 'modules/client/api';
import Row from 'components/Row';

type StoryAPI = APIClient<typeof import('pages/api/stories/[storyID]').default>;

type Values = {
	/** The pages currently loaded into the page editor, in reverse order (last page first). */
	pages: ClientStoryPage[]
};

type ServerSideProps = {
	privateStory: PrivateStory
} | {
	statusCode: number
};

const Component = withErrorPage<ServerSideProps>(({ privateStory: initialPrivateStory }) => {
	const [privateStory, setPrivateStory] = useState(initialPrivateStory);
	const [initialPages, setInitialPages] = useState<ClientStoryPage[]>([]);

	const notifyCheckboxRef = useRef<HTMLInputElement>(null!);

	return (
		<Page heading="Edit Adventure">
			<Formik
				initialValues={{
					pages: initialPages
				}}
				onSubmit={
					useCallback(async (values: Values) => {

					}, [])
				}
			>
				{({ isSubmitting, dirty, values, setFieldValue }) => {
					useLeaveConfirmation(dirty);

					return (
						<Form>
							<Box>
								<BoxSection
									id="editor-options"
									heading={privateStory.title}
								>
									<Row>
										<Button
											className="small"
											href={`/s/${privateStory.id}/edit`}
										>
											Edit Adventure
										</Button>
										<Button className="small">Jump to Page</Button>
										<Button className="small">Find and Replace</Button>
									</Row>
									<Row>
										<label>
											<input
												type="checkbox"
												className="spaced"
												ref={notifyCheckboxRef}
											/>
											<span className="spaced">
												Notify readers of newly published pages during this editing session
											</span>
										</label>
									</Row>
								</BoxSection>
							</Box>
							<Row id="story-page-actions">
								<Button
									onClick={
										useCallback(() => {
											const id = (
												values.pages.length
													? values.pages[0].id + 1
													: 1
											);

											setFieldValue('pages', [
												{
													id,
													title: '',
													content: '',
													nextPages: [id + 1],
													tags: [],
													unlisted: false,
													commentary: ''
												},
												...values.pages
											]);
										}, [values.pages, setFieldValue])
									}
								>
									New Page
								</Button>
								<Button
									type="submit"
									className="alt"
									disabled={!dirty || isSubmitting}
								>
									Save All
								</Button>
								<Button
									className="alt"
									disabled={true || dirty || isSubmitting}
								>
									Publish
								</Button>
							</Row>
							<Box id="story-page-sections">
								{values.pages.map((page, index) => (
									<Fragment key={page.id}>
										<BoxSection
											className="story-page-section"
											heading={`Page ${page.id}`}
										>
											{page.content}
										</BoxSection>
										{page.id !== (
											index === values.pages.length - 1
												? 1
												// The ID of the following page plus 1, which is what this page's ID should be if and only if there are no gaps. (The pages are in reverse, so the following page has an ID one lower than this page, given there's no gap.)
												: values.pages[index + 1].id + 1
										) && (
											// There is a gap in the page IDs, so present an option to load the missing pages.
											<div className="story-page-view-actions">
												<Button>
													Load More
												</Button>
											</div>
										)}
									</Fragment>
								))}
							</Box>
						</Form>
					);
				}}
			</Formik>
		</Page>
	);
});

export default Component;

export const getServerSideProps = withStatusCode<ServerSideProps>(async ({ req, params }) => {
	const story = await getStoryByUnsafeID(params.storyID);

	if (!(
		story && req.user && (
			story.owner.equals(req.user._id)
			|| story.editors.some(userID => userID.equals(req.user!._id))
			|| req.user.perms & Perm.sudoRead
		)
	)) {
		return { props: { statusCode: 403 } };
	}

	return {
		props: {
			privateStory: getPrivateStory(story)
		}
	};
});