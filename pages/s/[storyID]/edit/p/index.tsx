import './styles.module.scss';
import Page from 'components/Page';
import { Perm } from 'modules/client/perms';
import { withErrorPage } from 'modules/client/errors';
import { withStatusCode } from 'modules/server/errors';
import type { FormikProps } from 'formik';
import { Field, Form, Formik } from 'formik';
import type { ChangeEvent, Dispatch, MutableRefObject, ReactNode, SetStateAction } from 'react';
import { useCallback, useRef, useState, useEffect, createContext, useMemo } from 'react';
import { getChangedValues, useLeaveConfirmation } from 'modules/client/forms';
import Box from 'components/Box';
import Button from 'components/Button';
import type { StoryID, StoryPageID } from 'modules/server/stories';
import { getClientStoryPage, getPrivateStory, getStoryByUnsafeID } from 'modules/server/stories';
import type { ClientStoryPage, ClientStoryPageRecord, PrivateStory } from 'modules/client/stories';
import BoxSection from 'components/Box/BoxSection';
import type { APIClient } from 'modules/client/api';
import Row from 'components/Row';
import Label from 'components/Label';
import api from 'modules/client/api';
import useThrottledCallback from 'modules/client/useThrottledCallback';
import axios from 'axios';
import StoryEditorPageSection from 'components/StoryEditorPageSection';
import { useIsomorphicLayoutEffect, useLatest } from 'react-use';
import Dialog from 'modules/client/Dialog';
import InlineRowSection from 'components/Box/InlineRowSection';
import FieldBoxRow from 'components/Box/FieldBoxRow';
import LabeledBoxRow from 'components/Box/LabeledBoxRow';
import { escapeRegExp } from 'lodash';
import BoxRow from 'components/Box/BoxRow';
import Router from 'next/router';

type StoryAPI = APIClient<typeof import('pages/api/stories/[storyID]').default>;
type StoryPagesAPI = APIClient<typeof import('pages/api/stories/[storyID]/pages').default>;

export type Values = {
	/** An object mapping page IDs to their respective pages. Since this object has numeric keys, standard JavaScript automatically sorts its properties by lowest first. */
	pages: ClientStoryPageRecord
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

export const StoryEditorContext = createContext<{
	storyID: StoryID,
	firstDraftID: StoryPageID | undefined,
	formikPropsRef: MutableRefObject<FormikProps<Values>>,
	setInitialPages: Dispatch<SetStateAction<ClientStoryPageRecord>>,
	queuedValuesRef: MutableRefObject<Values | undefined>,
	/** Whether the form is loading. */
	isSubmitting: boolean,
	cachedPageHeightsRef: MutableRefObject<Partial<Record<number, number>>>
}>(undefined!);

type ServerSideProps = {
	privateStory: PrivateStory,
	pages: ClientStoryPageRecord
} | {
	statusCode: number
};

const Component = withErrorPage<ServerSideProps>(({
	privateStory: initialPrivateStory,
	pages: initialPagesProp
}) => {
	const [privateStory, setPrivateStory] = useState(initialPrivateStory);
	const [initialPages, setInitialPages] = useState(initialPagesProp);

	const formikPropsRef = useRef<FormikProps<Values>>(null!);

	const defaultPageTitleInputRef = useRef<HTMLInputElement>(null!);

	const cancelTokenSourceRef = useRef<ReturnType<typeof axios.CancelToken.source>>();

	const changeDefaultPageTitle = useThrottledCallback(async (event: ChangeEvent<HTMLInputElement>) => {
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
	}, [privateStory]);

	const onChangeDefaultPageTitle = useCallback((event: ChangeEvent<HTMLInputElement>) => {
		cancelTokenSourceRef.current?.cancel();

		if (!event.target.reportValidity()) {
			return;
		}

		changeDefaultPageTitle(event);
	}, [changeDefaultPageTitle]);

	const newPage = useCallback(() => {
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
			unlisted: false,
			disableControls: false,
			commentary: '',
			notify: true
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
	}, [privateStory.editorSettings.defaultPageTitle]);

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
				// Even though we have no `validate` function, these three props are necessary to set as a significant performance optimization.
				validateOnChange={false}
				validateOnBlur={false}
				validateOnMount={false}
				enableReinitialize
			>
				{formikProps => {
					// Using this instead of destructuring the Formik props directly is necessary as a performance optimization, to significantly reduce unnecessary re-renders.
					formikPropsRef.current = formikProps;

					useLeaveConfirmation(formikPropsRef.current.dirty);

					// As a network optimization, the default is `undefined` to prevent rendering page components server-side.
					const [viewMode, setViewMode] = useState<'list' | 'grid' | undefined>();

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

					const pageValues = Object.values(formikPropsRef.current.values.pages);

					// This state is a record that maps page IDs to a boolean of their `culled` prop, or undefined if the record hasn't been processed by the below effect hook yet.
					const [culledPages, setCulledPages] = useState<Partial<Record<StoryPageID, boolean>>>({});
					const culledPagesRef = useLatest(culledPages);

					// This state is for the default height of a culled page section.
					const [defaultCulledHeight, setDefaultCulledHeight] = useState(
						// An arbitrary default culled page section height. Shouldn't be too small, or else unnecessary re-renders may occur initially due to a higher chance of more page sections being temporarily in view for a short time.
						320
					);
					/** A ref to whether `defaultCulledHeight` is still unset. */
					const defaultCulledHeightUnsetRef = useRef(true);

					/** A ref to a partial record that maps each page's key to its cached height. */
					const cachedPageHeightsRef = useRef<Partial<Record<number, number>>>({});
					// Keys are used instead of page IDs so that cached heights are preserved correctly when pages are deleted or rearranged.

					// This is a layout effect rather than a normal effect to reduce the time the user can briefly see culled pages.
					useIsomorphicLayoutEffect(() => {
						if (viewMode) {
							// Set the view mode into the URL's query params.

							const url = new URL(location.href);
							url.searchParams.set('view', viewMode);
							history.replaceState(null, '', url);
						} else {
							// Now that we're on the client, it's safe to render the page components.

							// If the view mode is not set, load it from the URL's query params.
							setViewMode(Router.query.view === 'grid' ? 'grid' : 'list');

							// Wait for the page components to render.
							setTimeout(() => {
								if (location.hash) {
									// Since the location hash may reference a page component which wasn't rendered at the time that the browser tried to use it, set the hash again now that all the page components are rendered.

									const locationHash = location.hash;
									location.hash = '';
									location.hash = locationHash;
								}
							});
						}

						if (viewMode === 'list') {
							const updateCulledPages = () => {
								const newCulledPages: Record<StoryPageID, boolean> = {};
								let culledPagesChanged = false;

								const pageSections = document.getElementsByClassName('story-editor-page-section') as HTMLCollectionOf<HTMLDivElement>;

								let focusedPageSection: Node | null = document.activeElement;

								// Find the ancestor of `document.activeElement` which is a page section.
								while (
									focusedPageSection instanceof Element
									&& !focusedPageSection.classList.contains('story-editor-page-section')
								) {
									focusedPageSection = focusedPageSection.parentNode;
								}

								for (let i = 0; i < pageSections.length; i++) {
									const pageSection = pageSections[i];

									// If `pageSection.id === 'p14'` for example, then `pageID === 14`.
									const pageID = +pageSection.id.slice(1);

									// `getBoundingClientRect()` is significantly faster than `offsetTop` and `offsetHeight`.
									const rect = pageSection.getBoundingClientRect();

									const culled = !(
										// The first page and the last page must not be culled so that they can be tabbed into from outside of view.
										pageID === 1 || pageID === pageValues.length
										// Whether this page is visible.
										|| (
											// Whether the bottom of this page is below the top of the view.
											rect.bottom > 0
											// Whether the top of this page is above the bottom of the view.
											&& rect.top < document.documentElement.clientHeight + 1
										)
										// Page sections which have focus should not be culled, or else they would lose focus, causing inconvenience to the user.
										|| pageSection === focusedPageSection
										// The pages before and after a focused page must also not be culled, so that they can be tabbed into.
										|| pageSection.previousSibling === focusedPageSection
										|| pageSection.nextSibling === focusedPageSection
										// Page sections with invalid form elements should not be culled so those invalid elements can be detected and focused when the user attempts to submit.
										|| (
											// This page section was not culled last time.
											culledPagesRef.current[pageID] === false
											// This page section contains an invalid element.
											&& pageSection.querySelector(':invalid')
										)
									);

									newCulledPages[pageID] = culled;

									if (culledPagesRef.current[pageID] !== culled) {
										culledPagesChanged = true;

										if (culled) {
											// If this unculled page is changing to be culled, cache its height beforehand so it can maintain that height after being culled.
											cachedPageHeightsRef.current[
												// This page's key.
												(formikPropsRef.current.values.pages[pageID] as KeyedClientStoryPage)[_key]
											] = pageSection.offsetHeight;
										}
									}

									if (!culled && defaultCulledHeightUnsetRef.current) {
										// If this page section is unculled and no default culled page section height has been set yet, set the default culled height to this height.
										// Using an arbitrary unculled height as the default culled height is a sufficient solution for scroll jitter in the vast majority of cases.
										setDefaultCulledHeight(pageSection.offsetHeight);
										defaultCulledHeightUnsetRef.current = false;
									}
								}

								if (culledPagesChanged) {
									setCulledPages(newCulledPages);
								}
							};

							updateCulledPages();
							document.addEventListener('scroll', updateCulledPages);
							document.addEventListener('resize', updateCulledPages);
							// We use `focusin` instead of `focus` because the former bubbles while the latter doesn't.
							document.addEventListener('focusin', updateCulledPages);
							// We don't listen to `focusout` because, when `focusout` is dispatched, `document.activeElement` is set to `null`, causing any page section outside the view which the user is attempting to focus to instead be culled.
							// Also, not listening to `focusout` improves performance significantly by updating the culled page sections half as often when changing focus.

							return () => {
								document.removeEventListener('scroll', updateCulledPages);
								document.removeEventListener('resize', updateCulledPages);
								document.removeEventListener('focusin', updateCulledPages);
							};
						}
					}, [viewMode, pageValues.length, culledPagesRef]);

					let pageComponents: ReactNode[] | undefined;

					let firstDraftID: StoryPageID | undefined;

					if (viewMode) {
						pageComponents = new Array(pageValues.length);

						for (let i = pageValues.length - 1; i >= 0; i--) {
							const page = pageValues[i] as KeyedClientStoryPage;

							// If this page doesn't have a React key yet, set one.
							if (!(_key in page)) {
								page[_key] = nextKeyRef.current++;
							}

							if (viewMode === 'list') {
								const initialPublished = (
									formikPropsRef.current.initialValues.pages[page.id] as ClientStoryPage | undefined
								)?.published;

								if (initialPublished === undefined) {
									firstDraftID = page.id;
								}

								if (!(page.id in culledPages)) {
									// Not culling more than a few pages leads to unacceptably large initial load times.
									// We choose not to cull only the first page and the last two pages because that exact set of pages is the most likely to still be unculled after `updateCulledPages` is called, and thus it is the least likely to cause an unnecessary re-render due to a change in the culled pages.
									culledPages[page.id] = !(
										page.id === 1
										|| page.id >= pageValues.length - 1
									);
								}

								pageComponents.push(
									<StoryEditorPageSection
										// The `key` cannot be set to `page.id`, or else each page's states would not be respected when deleting or rearranging pages. A page's ID can change, but its key should not.
										key={page[_key]}
										page={page}
										culled={culledPages[page.id]!}
										initialPublished={initialPublished}
									/>
								);
							} else {
								// If this point is reached, `viewMode === 'grid'`.

								pageComponents.push(
									<div
										key={page[_key]}
										id={`p${page.id}`}
										className="story-editor-page-tile"
									/>
								);
							}
						}
					}

					/**
					 * The values to pass into the `value` of the `StoryEditorContext`.
					 *
					 * These values are passed through a context rather than directly as `StoryEditorPageSection` props to reduce `React.memo`'s prop comparison performance cost.
					 */
					const storyEditorContext = useMemo(() => ({
						storyID: privateStory.id,
						firstDraftID,
						formikPropsRef,
						setInitialPages,
						queuedValuesRef,
						isSubmitting: formikProps.isSubmitting,
						cachedPageHeightsRef
						// This ESLint comment is necessary because ESLint doesn't know that `privateStory.id` can change.
						// eslint-disable-next-line react-hooks/exhaustive-deps
					}), [formikProps.isSubmitting, firstDraftID, privateStory.id]);

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
											Edit Info
										</Button>
										<Button
											className="small"
											disabled={!pageValues.length}
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
											disabled={!pageValues.length}
											onClick={
												useCallback(async () => {
													const dialog = new Dialog({
														id: 'find-and-replace',
														title: 'Find and Replace',
														initialValues: {
															regex: false,
															find: '',
															flags: 'g',
															replace: ''
														},
														content: function Content({ values, setFieldValue }) {
															const findInputRef = useRef<HTMLInputElement>(null!);
															const flagsInputRef = useRef<HTMLInputElement>(null);

															useEffect(() => {
																let regexPatternError = false;

																if (values.regex && values.find) {
																	try {
																		new RegExp(values.find, '');
																	} catch {
																		regexPatternError = true;
																	}

																	let regexFlagsError = false;

																	try {
																		new RegExp('test', values.flags);
																	} catch {
																		regexFlagsError = true;
																	}

																	flagsInputRef.current!.setCustomValidity(regexFlagsError ? 'Please enter valid regex flags.' : '');
																}

																findInputRef.current.setCustomValidity(regexPatternError ? 'Please enter a valid regex pattern.' : '');
															}, [values.regex, values.find, values.flags]);

															return (
																<InlineRowSection>
																	<BoxRow>Finds and replaces text in every page's content.</BoxRow>
																	{values.regex ? (
																		<LabeledBoxRow
																			label="Find"
																			htmlFor="field-find"
																		>
																			/
																			<Field
																				id="field-find"
																				name="find"
																				required
																				autoFocus
																				innerRef={findInputRef}
																			/>
																			/
																			<Field
																				id="field-find"
																				name="flags"
																				size="5"
																				title="Flags"
																				autoComplete="off"
																				innerRef={flagsInputRef}
																			/>
																		</LabeledBoxRow>
																	) : (
																		<FieldBoxRow
																			name="find"
																			label="Find"
																			required
																			autoFocus
																			innerRef={findInputRef as any}
																		/>
																	)}
																	<FieldBoxRow
																		name="replace"
																		label="Replace With"
																	/>
																	<LabeledBoxRow
																		label="Case-Sensitive"
																		htmlFor="field-case-sensitive"
																	>
																		<input
																			id="field-case-sensitive"
																			type="checkbox"
																			checked={!values.flags.includes('i')}
																			onChange={
																				useCallback((event: ChangeEvent<HTMLInputElement>) => {
																					setFieldValue(
																						'flags',
																						event.target.checked
																							? values.flags.replace(/i/g, '')
																							: `${values.flags}i`
																					);
																				}, [setFieldValue, values.flags])
																			}
																		/>
																	</LabeledBoxRow>
																	<FieldBoxRow
																		type="checkbox"
																		name="regex"
																		label="Regex"
																		help={'If you don\'t know what this is, don\'t enable it.\n\nRegex allows for advanced search patterns and replacements.'}
																	/>
																</InlineRowSection>
															);
														},
														actions: [
															{ label: 'Replace All', autoFocus: false },
															'Cancel'
														]
													});

													if (!(await dialog)?.submit) {
														return;
													}

													const find = (
														dialog.form!.values.regex
															? new RegExp(dialog.form!.values.find, dialog.form!.values.flags)
															: new RegExp(
																escapeRegExp(dialog.form!.values.find),
																`g${dialog.form!.values.flags.includes('i') ? 'i' : ''}`
															)
													);

													for (const page of Object.values(formikPropsRef.current.values.pages)) {
														const replacedContent = page.content.replace(find, dialog.form!.values.replace);

														if (page.content !== replacedContent) {
															formikPropsRef.current.setFieldValue(`pages.${page.id}.content`, replacedContent);
														}
													}
												}, [])
											}
										>
											Find and Replace
										</Button>
										<Button
											className="small"
											disabled={!viewMode && formikPropsRef.current.dirty}
											onClick={
												useCallback(() => {
													// Toggle the `viewMode` between `'list'` and `'grid'`.
													setViewMode(viewMode => viewMode === 'list' ? 'grid' : 'list');
												}, [])
											}
										>
											{`View: ${viewMode === 'grid' ? 'Grid' : 'List'}`}
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
											onChange={onChangeDefaultPageTitle}
											ref={defaultPageTitleInputRef}
										/>
									</Row>
								</BoxSection>
							</Box>
							{viewMode && (
								viewMode === 'list' ? (
									<>
										<div id="story-editor-actions">
											<Button onClick={newPage}>
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
										<Box id="story-editor-pages" className="view-mode-list">
											<style jsx global>
												{`
													.story-editor-page-section.culled {
														height: ${defaultCulledHeight}px;
													}
												`}
											</style>
											<StoryEditorContext.Provider value={storyEditorContext}>
												{pageComponents}
											</StoryEditorContext.Provider>
										</Box>
									</>
								) : (
									<>
										<div id="story-editor-actions">
											<Button>
												Select All
											</Button>
											<Button>
												Move
											</Button>
											<Button>
												Delete
											</Button>
										</div>
										<div id="story-editor-pages" className="view-mode-grid">
											<StoryEditorContext.Provider value={storyEditorContext}>
												{pageComponents}
											</StoryEditorContext.Provider>
										</div>
									</>
								)
							)}
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