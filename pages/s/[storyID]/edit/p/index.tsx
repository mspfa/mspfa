import './styles.module.scss';
import Page from 'components/Page';
import { Perm } from 'modules/client/perms';
import { withErrorPage } from 'modules/client/errors';
import { withStatusCode } from 'modules/server/errors';
import { Form, Formik, Field } from 'formik';
import type { ChangeEvent } from 'react';
import { Fragment, useCallback, useRef, useState } from 'react';
import { useLeaveConfirmation } from 'modules/client/forms';
import Box from 'components/Box';
import Button from 'components/Button';
import { getPrivateStory, getStoryByUnsafeID } from 'modules/server/stories';
import type { ClientStoryPage, PrivateStory } from 'modules/client/stories';
import BoxSection from 'components/Box/BoxSection';
import type { APIClient } from 'modules/client/api';
import Row from 'components/Row';
import BBField from 'components/BBCode/BBField';
import Label from 'components/Label';
import api from 'modules/client/api';
import useThrottledCallback from 'modules/client/useThrottledCallback';
import axios from 'axios';

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

					const defaultPageTitleInputRef = useRef<HTMLInputElement>(null!);
					const firstPageFieldTitle = useRef<HTMLInputElement>(null);

					const cancelTokenSourceRef = useRef<ReturnType<typeof axios.CancelToken.source>>();

					const onChangeDefaultPageTitle = useThrottledCallback(async (event: ChangeEvent<HTMLInputElement>) => {
						setPrivateStory({
							...privateStory,
							editorSettings: {
								...privateStory.editorSettings,
								defaultPageTitle: event.target.value
							}
						});
						// Update the above state before syncing it with the server via the below request so the user can use the new default page title while the request is still loading.

						cancelTokenSourceRef.current = axios.CancelToken.source();

						await (api as StoryAPI).put(`/stories/${privateStory.id}`, {
							editorSettings: {
								defaultPageTitle: event.target.value
							}
						}, {
							cancelToken: cancelTokenSourceRef.current.token
						});

						cancelTokenSourceRef.current = undefined;

						// This ESLint comment is necessary because ESLint does not recognize that `privateStory` can change from outside the scope of this hook's component.
						// eslint-disable-next-line react-hooks/exhaustive-deps
					}, [privateStory]);

					return (
						<Form>
							<Box>
								<BoxSection
									id="story-editor-options"
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
										<Label
											className="spaced"
											htmlFor="field-default-page-title"
										>
											Default Page Title
										</Label>
										<input
											id="field-default-page-title"
											className="spaced"
											maxLength={500}
											defaultValue={privateStory.editorSettings.defaultPageTitle}
											autoComplete="off"
											onChange={
												useCallback((event: ChangeEvent<HTMLInputElement>) => {
													cancelTokenSourceRef.current?.cancel();

													if (!event.target.reportValidity()) {
														return;
													}

													onChangeDefaultPageTitle(event);
												}, [onChangeDefaultPageTitle])
											}
											ref={defaultPageTitleInputRef}
										/>
									</Row>
									<Row>
										<label>
											<input
												type="checkbox"
												className="spaced"
												defaultChecked
												ref={notifyCheckboxRef}
											/>
											<span className="spaced">
												Notify readers of newly published pages during this editing session
											</span>
										</label>
									</Row>
								</BoxSection>
							</Box>
							<div id="story-editor-actions">
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
													title: privateStory.editorSettings.defaultPageTitle,
													content: '',
													nextPages: [id + 1],
													tags: [],
													unlisted: false,
													commentary: ''
												},
												...values.pages
											]);

											// Wait for the newly added editor page to render.
											setTimeout(() => {
												// Select the title field of the newly added page.
												firstPageFieldTitle.current?.select();
											});

											// This ESLint comment is necessary because ESLint does not recognize that `privateStory.editorSettings.defaultPageTitle` can change from outside the scope of this hook's component.
											// eslint-disable-next-line react-hooks/exhaustive-deps
										}, [values.pages, setFieldValue, privateStory.editorSettings.defaultPageTitle])
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
							</div>
							<Box id="story-editor-pages">
								{values.pages.map((page, index) => (
									<Fragment key={page.id}>
										<BoxSection
											className="story-editor-page"
											heading={`Page ${page.id}`}
										>
											<div className="page-field single-line">
												<Label
													className="spaced"
													htmlFor={`field-pages-${index}-title`}
												>
													Title
												</Label>
												<Field
													name={`pages.${index}.title`}
													className="spaced"
													required
													maxLength={500}
													autoComplete="off"
													innerRef={firstPageFieldTitle}
												/>
											</div>
											<div className="page-field">
												<Label htmlFor={`field-pages-${index}-content`}>
													Content
												</Label>
												<BBField
													name={`pages.${index}.content`}
													rows={6}
												/>
											</div>
										</BoxSection>
										{page.id !== (
											index === values.pages.length - 1
												? 1
												// The ID of the following page plus 1, which is what this page's ID should be if and only if there are no gaps. (The pages are in reverse, so the following page has an ID one lower than this page, given there's no gap.)
												: values.pages[index + 1].id + 1
										) && (
											// There is a gap in the page IDs, so present an option to load the missing pages.
											<div className="story-editor-view-actions">
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