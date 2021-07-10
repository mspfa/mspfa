import './styles.module.scss';
import Page from 'components/Page';
import { Perm } from 'modules/client/perms';
import { withErrorPage } from 'modules/client/errors';
import { withStatusCode } from 'modules/server/errors';
import { Form, Formik } from 'formik';
import type { ChangeEvent } from 'react';
import { Fragment, useCallback, useRef, useState } from 'react';
import { useLeaveConfirmation } from 'modules/client/forms';
import Box from 'components/Box';
import Button from 'components/Button';
import type { StoryPageID } from 'modules/server/stories';
import { getPrivateStory, getStoryByUnsafeID } from 'modules/server/stories';
import type { ClientStoryPage, PrivateStory } from 'modules/client/stories';
import BoxSection from 'components/Box/BoxSection';
import type { APIClient } from 'modules/client/api';
import Row from 'components/Row';
import Label from 'components/Label';
import api from 'modules/client/api';
import useThrottledCallback from 'modules/client/useThrottledCallback';
import axios from 'axios';
import StoryEditorPage from 'components/StoryEditorPage';
import { useLatest } from 'react-use';

type StoryAPI = APIClient<typeof import('pages/api/stories/[storyID]').default>;

export type Values = {
	/** An object mapping page IDs to their respective pages. Since this object has numeric keys, standard JavaScript automatically sorts its properties by lowest first. */
	pages: Record<StoryPageID, ClientStoryPage>
};

type ServerSideProps = {
	privateStory: PrivateStory
} | {
	statusCode: number
};

const Component = withErrorPage<ServerSideProps>(({ privateStory: initialPrivateStory }) => {
	const [privateStory, setPrivateStory] = useState(initialPrivateStory);
	const [initialPages, setInitialPages] = useState<Values['pages']>({});

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
				{formikProps => {
					// Using this instead of destructuring the Formik props directly is necessary as a performance optimization, to significantly reduce unnecessary re-renders.
					const formikPropsRef = useLatest(formikProps);

					useLeaveConfirmation(formikPropsRef.current.dirty);

					const defaultPageTitleInputRef = useRef<HTMLInputElement>(null!);
					const firstTitleInputRef = useRef<HTMLInputElement>(null);

					const cancelTokenSourceRef = useRef<ReturnType<typeof axios.CancelToken.source>>();

					const onChangeDefaultPageTitle = useThrottledCallback(async (event: ChangeEvent<HTMLInputElement>) => {
						setPrivateStory({
							...privateStory,
							editorSettings: {
								...privateStory.editorSettings,
								defaultPageTitle: event.target.value
							}
						});
						// The reason the above state is updated before syncing with the server via the below request rather than after is so the user can use the new default page title while the request is still loading.

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
											const pageIDs = Object.keys(formikPropsRef.current.values.pages);

											// Get the ID of a new page being added after the last one.
											const id = (
												pageIDs.length
													? +pageIDs[pageIDs.length - 1] + 1
													: 1
											);

											const newPage: ClientStoryPage = {
												id,
												title: privateStory.editorSettings.defaultPageTitle,
												content: '',
												nextPages: [id + 1],
												tags: [],
												unlisted: false,
												disableControls: false,
												commentary: '',
												notify: true
											};

											formikPropsRef.current.setFieldValue('pages', {
												[id]: newPage,
												...formikPropsRef.current.values.pages
											});

											// Wait for the newly added editor page to render.
											setTimeout(() => {
												// Select the title field of the newly added page.
												firstTitleInputRef.current?.select();
											});

											// This ESLint comment is necessary because ESLint does not recognize that `privateStory.editorSettings.defaultPageTitle` can change from outside the scope of this hook's component.
											// eslint-disable-next-line react-hooks/exhaustive-deps
										}, [formikPropsRef, privateStory.editorSettings.defaultPageTitle])
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
								<Button
									className="alt"
									disabled={true || formikPropsRef.current.dirty}
								>
									Publish
								</Button>
							</div>
							<Box id="story-editor-pages">
								{Object.values(formikPropsRef.current.values.pages).reverse().map((page, i, pages) => (
									<Fragment key={page.id}>
										<StoryEditorPage
											storyID={privateStory.id}
											formikPropsRef={formikPropsRef}
											firstTitleInputRef={i === 0 ? firstTitleInputRef : undefined}
										>
											{page}
										</StoryEditorPage>
										{page.id !== (
											i === pages.length - 1
												// If this is the first page (which is last in the array since the pages are in reverse), there is a gap if and only if this page's ID is not 1.
												? 1
												// The ID of the previous page plus 1, which is what this page's ID should be if and only if there are no gaps. (The pages are in reverse, so the previous page has index `i + 1`.)
												: pages[i + 1].id + 1
										) && (
											// There is a gap in the page IDs, so present an option to load the missing pages.
											<div className="story-editor-view-actions">
												<Button>
													Load Pages X-Y
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