import './styles.module.scss';
import Page from 'components/Page';
import { Perm } from 'modules/client/perms';
import { withErrorPage } from 'modules/client/errors';
import { withStatusCode } from 'modules/server/errors';
import { Form, Formik } from 'formik';
import type { ChangeEvent, ReactNode } from 'react';
import { useCallback, useRef, useState } from 'react';
import { getChangedValues, useLeaveConfirmation } from 'modules/client/forms';
import Box from 'components/Box';
import Button from 'components/Button';
import type { StoryPageID } from 'modules/server/stories';
import { getClientStoryPage, getPrivateStory, getStoryByUnsafeID } from 'modules/server/stories';
import type { ClientStoryPage, ClientStoryPageRecord, PrivateStory } from 'modules/client/stories';
import BoxSection from 'components/Box/BoxSection';
import type { APIClient } from 'modules/client/api';
import Row from 'components/Row';
import Label from 'components/Label';
import api from 'modules/client/api';
import useThrottledCallback from 'modules/client/useThrottledCallback';
import axios from 'axios';
import StoryEditorPage from 'components/StoryEditorPage';
import { useIsomorphicLayoutEffect, useLatest } from 'react-use';
import Dialog from 'modules/client/Dialog';
import InlineRowSection from 'components/Box/InlineRowSection';
import FieldBoxRow from 'components/Box/FieldBoxRow';

type StoryAPI = APIClient<typeof import('pages/api/stories/[storyID]').default>;
type StoryPagesAPI = APIClient<typeof import('pages/api/stories/[storyID]/pages').default>;

export type Values = {
	/** An object mapping page IDs to their respective pages. Since this object has numeric keys, standard JavaScript automatically sorts its properties by lowest first. */
	pages: ClientStoryPageRecord
};

type ServerSideProps = {
	privateStory: PrivateStory,
	pages: ClientStoryPageRecord
} | {
	statusCode: number
};

/**
 * The symbol used to index a `ClientStoryPage`'s React key.
 *
 * This must be a symbol rather than a string so it is not detected when diffing pages for unsaved changes, but it is still kept when creating a shallow clone of the page.
 */
export const _key = Symbol('key');

/** A `ClientStoryPage` with a React key. */
export type KeyedClientStoryPage = ClientStoryPage & {
	/** This page's React key. */
	[_key]: number
};

const Component = withErrorPage<ServerSideProps>(({
	privateStory: initialPrivateStory,
	pages: initialPagesProp
}) => {
	const [privateStory, setPrivateStory] = useState(initialPrivateStory);
	const [initialPages, setInitialPages] = useState(initialPagesProp);

	return (
		<Page heading="Edit Adventure">
			<Formik<Values>
				initialValues={{
					pages: initialPages
				}}
				onSubmit={
					useCallback(async values => {
						const changedValues = getChangedValues(initialPages, values.pages);

						if (!changedValues) {
							return;
						}

						const { data: newPages } = await (api as StoryPagesAPI).put(`/stories/${privateStory.id}/pages`, changedValues as any);

						// Preserve the React keys of updated pages.
						for (const newPage of Object.values(newPages)) {
							(newPage as KeyedClientStoryPage)[_key] = (
								values.pages[newPage.id] as KeyedClientStoryPage
							)[_key];
						}

						setInitialPages({
							...initialPages,
							...newPages
						});
					}, [privateStory.id, initialPages])
				}
				enableReinitialize
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

					/**
					 * Anything set to this ref should be set as the Formik values once before rendering.
					 *
					 * Values must be queued instead of set immediately whenever this form's initial values are changed, since doing so resets the values due to the `enableReinitialization` prop on the `Formik` component.
					*/
					const queuedValuesRef = useRef<Values>();

					useIsomorphicLayoutEffect(() => {
						if (queuedValuesRef.current) {
							// Set the values queued in `queuedValuesRef`.
							formikPropsRef.current.setValues(queuedValuesRef.current);

							queuedValuesRef.current = undefined;
						}
					});

					/** A ref to the next React key a `ClientStoryPage` should use. This is incremented after each time it is assigned to a page. */
					const nextKeyRef = useRef(0);

					const pageComponents: ReactNode[] = [];
					const pageValues = Object.values(formikPropsRef.current.values.pages);

					let firstDraftID: StoryPageID | undefined;

					for (let i = 0; i < pageValues.length; i++) {
						const page = pageValues[i] as KeyedClientStoryPage;

						// If this page doesn't have a React key yet, set one.
						if (!(_key in page)) {
							page[_key] = nextKeyRef.current++;
						}

						const initialPublished = (
							formikPropsRef.current.initialValues.pages[page.id] as ClientStoryPage | undefined
						)?.published;

						// If the `firstDraftID` hasn't been found yet, and this page is a draft, then set the `firstDraftID` to this page's ID.
						if (firstDraftID === undefined && initialPublished === undefined) {
							firstDraftID = page.id;
						}

						pageComponents.unshift(
							<StoryEditorPage
								// The `key` cannot be set to `page.id`, or else each page's states would not be respected when deleting or rearranging pages. A page's ID can change, but its key should not.
								key={page[_key]}
								storyID={privateStory.id}
								initialPublished={initialPublished}
								firstDraftID={firstDraftID}
								formikPropsRef={formikPropsRef}
								setInitialPages={setInitialPages}
								queuedValuesRef={queuedValuesRef}
								isSubmitting={formikPropsRef.current.isSubmitting}
								firstTitleInputRef={i === 0 ? firstTitleInputRef : undefined}
							>
								{page}
							</StoryEditorPage>
						);
					}

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
										<Button
											className="small"
											disabled={!(1 in formikPropsRef.current.values.pages)}
											onClick={
												useCallback(async () => {
													const dialog = new Dialog({
														id: 'jump-to-page',
														title: 'Jump to Page',
														initialValues: {
															pageID: '' as number | ''
														},
														content: (
															<InlineRowSection>
																<FieldBoxRow
																	type="number"
																	name="pageID"
																	label="Page Number"
																	required
																	autoFocus
																	min={1}
																	max={pageValues.length}
																/>
															</InlineRowSection>
														),
														actions: [
															{ label: 'Jump!', autoFocus: false },
															'Cancel'
														]
													});

													if (!(await dialog)?.submit) {
														return;
													}

													location.hash = '';
													location.hash = `p${dialog.form!.values.pageID}`;
												}, [pageValues.length])
											}
										>
											Jump to Page
										</Button>
										<Button
											className="small"
											disabled={formikPropsRef.current.isSubmitting}
										>
											Find and Replace
										</Button>
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
								</BoxSection>
							</Box>
							<div id="story-editor-actions">
								<Button
									onClick={
										useCallback(() => {
											const pages = Object.values(formikPropsRef.current.values.pages);

											// Get the ID of a new page being added after the last one.
											const id = (
												pages.length
													? +pages[pages.length - 1].id + 1
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
							</div>
							<Box id="story-editor-pages">
								{pageComponents}
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

	const clientPages: ClientStoryPageRecord = {};

	for (const page of Object.values(story.pages)) {
		clientPages[page.id] = getClientStoryPage(page);
	}

	return {
		props: {
			privateStory: getPrivateStory(story),
			pages: clientPages
		}
	};
});