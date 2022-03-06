import './styles.module.scss';
import Section from 'components/Section';
import Button from 'components/Button';
import Label from 'components/Label';
import Row from 'components/Row';
import Dialog from 'lib/client/Dialog';
import replaceAll from 'lib/client/replaceAll';
import useFunction from 'lib/client/reactHooks/useFunction';
import { escapeRegExp } from 'lodash';
import type { ChangeEvent, Dispatch, SetStateAction } from 'react';
import { useContext, useEffect, useRef } from 'react';
import LabeledGrid from 'components/LabeledGrid';
import LabeledGridField from 'components/LabeledGrid/LabeledGridField';
import LabeledGridRow from 'components/LabeledGrid/LabeledGridRow';
import { Field } from 'formik';
import type { CancelTokenSource } from 'axios';
import axios from 'axios';
import useThrottled from 'lib/client/reactHooks/useThrottled';
import type { APIClient } from 'lib/client/api';
import api from 'lib/client/api';
import type { integer } from 'lib/types';
import { StoryEditorContext } from 'components/StoryEditor';
import type { PrivateStory } from 'lib/client/stories';

type StoryAPI = APIClient<typeof import('pages/api/stories/[storyID]').default>;

export type StoryEditorPagesOptionsProps = {
	story: PrivateStory,
	setStory: Dispatch<SetStateAction<PrivateStory>>,
	viewMode: 'grid' | 'list',
	setViewMode: Dispatch<SetStateAction<'grid' | 'list'>>,
	sortMode: 'oldest' | 'newest',
	setSortMode: Dispatch<SetStateAction<'oldest' | 'newest'>>,
	pageCount: integer
};

/** A `Section` of options for the `StoryEditor`'s pages. */
const StoryEditorPagesOptions = ({
	story,
	setStory,
	viewMode,
	setViewMode,
	sortMode,
	setSortMode,
	pageCount
}: StoryEditorPagesOptionsProps) => {
	const { formikPropsRef } = useContext(StoryEditorContext)!;

	const defaultPageTitleInputRef = useRef<HTMLInputElement>(null!);

	const cancelTokenSourceRef = useRef<CancelTokenSource>();

	const changeDefaultPageTitle = useThrottled(async (event: ChangeEvent<HTMLInputElement>) => {
		setStory({
			...story,
			defaultPageTitle: event.target.value
		});
		// The reason the above state is updated before syncing with the server via the below request rather than after is so the user can use the new default page title while the request is still loading.

		cancelTokenSourceRef.current = axios.CancelToken.source();

		await (api as StoryAPI).patch(`/stories/${story.id}`, {
			defaultPageTitle: event.target.value
		}, {
			cancelToken: cancelTokenSourceRef.current.token
		});

		cancelTokenSourceRef.current = undefined;
	});

	const onChangeDefaultPageTitle = useFunction((event: ChangeEvent<HTMLInputElement>) => {
		cancelTokenSourceRef.current?.cancel();

		if (!event.target.reportValidity()) {
			return;
		}

		changeDefaultPageTitle(event);
	});

	const findAndReplace = useFunction(async () => {
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
					<LabeledGrid>
						<Row>Finds and replaces text in every page's content.</Row>
						{values.regex ? (
							<LabeledGridRow
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
							</LabeledGridRow>
						) : (
							<LabeledGridField
								name="find"
								label="Find"
								required
								autoFocus
								innerRef={findInputRef as any}
							/>
						)}
						<LabeledGridField
							name="replace"
							label="Replace With"
						/>
						<LabeledGridRow
							label="Case-Sensitive"
							htmlFor="field-case-sensitive"
						>
							<input
								id="field-case-sensitive"
								type="checkbox"
								checked={!values.flags.includes('i')}
								onChange={
									useFunction((event: ChangeEvent<HTMLInputElement>) => {
										setFieldValue(
											'flags',
											event.target.checked
												? replaceAll(values.flags, 'i', '')
												: `${values.flags}i`
										);
									})
								}
							/>
						</LabeledGridRow>
						<LabeledGridField
							type="checkbox"
							name="regex"
							label="Regex"
							help={'If you don\'t know what this is, don\'t enable it.\n\nRegex allows for advanced search patterns and replacements.'}
						/>
					</LabeledGrid>
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

		if (formikPropsRef.current.isSubmitting) {
			new Dialog({
				id: 'find-and-replace',
				title: 'Find and Replace',
				content: 'The specified action could not be completed, as the form is currently read-only.'
			});
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
	});

	return (
		<Section
			id="story-editor-pages-options"
			heading={story.title}
		>
			<Row>
				<Button
					className="small"
					href={`/stories/${story.id}/edit`}
				>
					Edit Info
				</Button>
				{viewMode === 'list' && (
					<Button
						className="small"
						disabled={formikPropsRef.current.isSubmitting || !pageCount}
						onClick={findAndReplace}
					>
						Find and Replace
					</Button>
				)}
				<Button
					className="small"
					disabled={!pageCount}
					onClick={
						useFunction(async () => {
							const dialog = new Dialog({
								id: 'jump-to-page',
								title: 'Jump to Page',
								initialValues: {
									pageID: '' as number | ''
								},
								content: (
									<LabeledGrid>
										<LabeledGridField
											type="number"
											name="pageID"
											label="Page Number"
											required
											autoFocus
											min={1}
											max={Object.values(formikPropsRef.current.values.pages).length}
										/>
									</LabeledGrid>
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
						})
					}
				>
					Jump to Page
				</Button>
				<Button
					className="small"
					title={`Set View Mode to ${viewMode === 'grid' ? 'List' : 'Grid'}`}
					disabled={formikPropsRef.current.isSubmitting}
					onClick={
						useFunction(() => {
							if (formikPropsRef.current.dirty) {
								new Dialog({
									id: 'story-editor-view-mode',
									title: 'View Mode',
									content: 'You cannot change the view mode with unsaved changes.'
								});
								return;
							}

							setViewMode(viewMode === 'list' ? 'grid' : 'list');
						})
					}
				>
					{`View: ${viewMode === 'grid' ? 'Grid' : 'List'}`}
				</Button>
			</Row>
			{viewMode === 'list' && (
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
						defaultValue={story.defaultPageTitle}
						autoComplete="off"
						onChange={onChangeDefaultPageTitle}
						ref={defaultPageTitleInputRef}
					/>
				</Row>
			)}
			<Row>
				<Label className="spaced" htmlFor="field-sort-pages">
					Sort Pages By
				</Label>
				<select
					id="field-sort-pages"
					className="spaced"
					defaultValue={sortMode}
					onChange={
						useFunction((event: ChangeEvent<HTMLSelectElement>) => {
							setSortMode(event.target.value as 'newest' | 'oldest');
						})
					}
				>
					<option value="newest">Newest</option>
					<option value="oldest">Oldest</option>
				</select>
			</Row>
		</Section>
	);
};

export default StoryEditorPagesOptions;