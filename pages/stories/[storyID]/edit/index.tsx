import './styles.module.scss';
import Page from 'components/Page';
import { Perm } from 'lib/client/perms';
import { withErrorPage } from 'lib/client/errors';
import withStatusCode from 'lib/server/withStatusCode';
import { Field, Form, Formik } from 'formik';
import type { ChangeEvent } from 'react';
import { useState } from 'react';
import useFunction from 'lib/client/reactHooks/useFunction';
import { getChangedValues, useLeaveConfirmation } from 'lib/client/forms';
import BottomActions from 'components/BottomActions';
import Button from 'components/Button';
import { getPrivateStory } from 'lib/server/stories';
import getStoryByUnsafeID from 'lib/server/stories/getStoryByUnsafeID';
import type { PrivateStory } from 'lib/client/stories';
import { storyStatusNames } from 'lib/client/StoryStatus';
import type StoryStatus from 'lib/client/StoryStatus';
import StoryPrivacy, { storyPrivacyNames } from 'lib/client/StoryPrivacy';
import LabeledGridSection from 'components/Section/LabeledGridSection';
import LabeledGridField from 'components/LabeledGrid/LabeledGridField';
import IconImage from 'components/IconImage';
import LabeledGridRow from 'components/LabeledGrid/LabeledGridRow';
import UserField from 'components/UserField';
import type { PublicUser } from 'lib/client/users';
import { useUser } from 'lib/client/reactContexts/UserContext';
import { useUserCache } from 'lib/client/reactContexts/UserCache';
import { uniq, uniqBy } from 'lodash';
import users, { getPublicUser } from 'lib/server/users';
import UserArrayField from 'components/UserField/UserArrayField';
import Columns from 'components/Columns';
import Section from 'components/Section';
import Label from 'components/Label';
import BBField from 'components/BBCode/BBField';
import Row from 'components/Row';
import TagField from 'components/TagField';
import type { APIClient } from 'lib/client/api';
import api from 'lib/client/api';
import DateField from 'components/DateField';
import Timestamp from 'components/Timestamp';
import EditButton from 'components/Button/EditButton';
import Dialog from 'lib/client/Dialog';
import type { integer } from 'lib/types';
import StoryIDContext from 'lib/client/reactContexts/StoryIDContext';
import useSubmitOnSave from 'lib/client/reactHooks/useSubmitOnSave';

type StoryAPI = APIClient<typeof import('pages/api/stories/[storyID]').default>;

const getValuesFromStory = (story: PrivateStory) => ({
	anniversary: new Date(0).setFullYear(
		story.anniversary.year,
		story.anniversary.month,
		story.anniversary.day
	),
	title: story.title,
	status: story.status.toString(),
	privacy: story.privacy.toString(),
	owner: story.owner,
	editors: story.editors,
	author: story.author || {
		name: '',
		site: ''
	},
	description: story.description,
	icon: story.icon,
	banner: story.banner,
	style: story.style,
	script: story.script,
	tags: story.tags,
	allowComments: story.allowComments,
	sidebarContent: story.sidebarContent
});

type Values = ReturnType<typeof getValuesFromStory>;

type ServerSideProps = {
	story: PrivateStory,
	userCache: PublicUser[]
} | {
	statusCode: integer
};

const Component = withErrorPage<ServerSideProps>(({
	story: initialStory,
	userCache: initialUserCache
}) => {
	const [story, setStory] = useState(initialStory);

	const { cacheUser } = useUserCache();
	initialUserCache.forEach(cacheUser);

	const user = useUser()!;

	const initialValues = getValuesFromStory(story);

	const ownerPerms = (
		user.id === story.owner
		|| !!(user.perms & Perm.sudoWrite)
	);

	const [editingAnniversary, setEditingAnniversary] = useState(false);

	const editAnniversary = useFunction(async () => {
		if (!await Dialog.confirm({
			id: 'edit-anniversary',
			title: 'Edit Creation Date',
			content: 'You can only change this adventure\'s creation date once.\n\nOnce changed, it cannot be undone.\n\nAre you sure you want to edit the creation date?'
		})) {
			return;
		}

		setEditingAnniversary(true);
	});

	const [loadingRestore, setLoadingRestore] = useState(false);

	const restoreStory = useFunction(async () => {
		setLoadingRestore(true);

		const { data: newStory } = await (api as StoryAPI).patch(`/stories/${story.id}`, {
			willDelete: false
		}).finally(() => {
			setLoadingRestore(false);
		});

		setStory(newStory);
	});

	const onSubmit = useFunction(async (values: Values) => {
		const changedValues = getChangedValues(initialValues, values);

		if (!changedValues) {
			return;
		}

		const anniversaryDate = (
			changedValues.anniversary === undefined
				? undefined
				: new Date(changedValues.anniversary)
		);

		const { data: newStory } = await (api as StoryAPI).patch(`/stories/${story.id}`, {
			...changedValues,
			anniversary: anniversaryDate && {
				year: anniversaryDate.getFullYear(),
				month: anniversaryDate.getMonth(),
				day: anniversaryDate.getDate()
			},
			status: changedValues.status ? +changedValues.status : undefined,
			privacy: changedValues.privacy ? +changedValues.privacy : undefined
		});

		setStory(newStory);

		setEditingAnniversary(false);
	});

	const daysUntilDeletion = story.willDelete !== undefined && (
		Math.round(
			(story.willDelete - Date.now())
			/ (1000 * 60 * 60 * 24)
		)
	);

	const pageComponent = (
		<Page heading="Edit Adventure">
			{story.willDelete ? (
				<>
					<Section heading="Deleted Adventure">
						<Row>
							<i>{story.title}</i>
							{` will be permanently deleted in ~${daysUntilDeletion} day${daysUntilDeletion === 1 ? '' : 's'}.`}
						</Row>
					</Section>
					<BottomActions>
						{ownerPerms && (
							<Button
								disabled={loadingRestore}
								onClick={restoreStory}
							>
								Restore
							</Button>
						)}
					</BottomActions>
				</>
			) : (
				<Formik
					initialValues={initialValues}
					onSubmit={onSubmit}
					enableReinitialize
				>
					{({ isSubmitting, dirty, values, handleChange, setFieldValue, setSubmitting, submitForm }) => {
						const shouldLeave = useLeaveConfirmation(dirty);

						const [ownerBeforeEdit, setOwnerBeforeEdit] = useState<string | undefined>(values.owner || story.owner);

						const deleteStory = useFunction(async () => {
							if (!(
								shouldLeave()
								&& await Dialog.confirm({
									id: 'delete-story',
									title: 'Delete Adventure',
									content: (
										<>
											Are you sure you want to delete this adventure?<br />
											<br />
											The adventure can be restored from the page you're currently on within 30 days after deletion.<br />
											<br />
											If you do not restore it within 30 days, <span className="bolder red">the deletion will be irreversible.</span><br />
											<br />
											<label>
												<input
													type="checkbox"
													className="spaced"
													required
													autoFocus
												/>
												<span className="spaced bolder">
													I am sure I want to delete this adventure: <i>{story.title}</i>
												</span>
											</label>
										</>
									),
									actions: [
										{ label: 'Yes', autoFocus: false },
										'No'
									]
								})
							)) {
								return;
							}

							setSubmitting(true);

							const { data: newStory } = await (api as StoryAPI).patch(`stories/${story.id}`, {
								willDelete: true
							}).finally(() => {
								setSubmitting(false);
							});

							setStory(newStory);

							setEditingAnniversary(false);
						});

						return (
							<Form
								ref={useSubmitOnSave({ submitForm, dirty, isSubmitting })}
							>
								<Section
									id="story-editor-options"
									heading={story.title}
								>
									{story.pageCount !== 0 && (
										<Button
											className="small"
											href={`/?s=${story.id}&p=1`}
										>
											View
										</Button>
									)}
									<Button
										className="small"
										href={`/stories/${story.id}/edit/pages`}
									>
										Edit Pages
									</Button>
								</Section>
								<Columns ofSections>
									<LabeledGridSection id="story-editor-info" heading="Info">
										<LabeledGridField
											name="title"
											label="Title"
											autoComplete="off"
											required
											maxLength={50}
										/>
										<LabeledGridField
											as="select"
											name="status"
											label="Status"
											required
										>
											{Object.keys(storyStatusNames).map(status => (
												<option
													key={status}
													value={status}
												>
													{storyStatusNames[status as unknown as StoryStatus]}
												</option>
											))}
										</LabeledGridField>
										<LabeledGridField
											as="select"
											name="privacy"
											label="Privacy"
											help={
												`${storyPrivacyNames[StoryPrivacy.Public]}: Anyone can see this adventure.\n`
												+ `${storyPrivacyNames[StoryPrivacy.Unlisted]}: Only users with this adventure's URL can see this adventure.\n`
												+ `${storyPrivacyNames[StoryPrivacy.Private]}: Only this adventure's owner and editors can see this adventure.`
											}
											required
											onChange={
												useFunction((event: ChangeEvent<HTMLSelectElement>) => {
													handleChange(event);

													if (+event.target.value !== StoryPrivacy.Public) {
														// If the story is not public, reset the anniversary date and banner URL fields so they can be safely hidden without unsaved changes.

														setFieldValue('anniversary', initialValues.anniversary);
														setFieldValue('banner', initialValues.banner);
													}
												})
											}
										>
											{Object.keys(storyPrivacyNames).map(privacy => (
												<option
													key={privacy}
													value={privacy}
												>
													{(storyPrivacyNames as any)[privacy]}
												</option>
											))}
										</LabeledGridField>
										<LabeledGridField
											type="url"
											name="icon"
											label="Icon URL"
											help="A direct URL to an image of your adventure's icon. The recommended image size is 150x150 pixels."
										/>
										<Row>
											<IconImage
												id="story-editor-icon"
												src={values.icon}
												alt="Your Adventure's Icon"
											/>
										</Row>
									</LabeledGridSection>
									<LabeledGridSection id="story-editor-misc" heading="Misc">
										<LabeledGridRow label="Owner">
											<UserField
												name="owner"
												required
												readOnly={!ownerPerms}
												editTitle="Edit Owner"
												confirmEdit={
													values.owner === user.id
														? 'Are you sure you want to transfer this adventure\'s ownership to someone else?\n\nYou will remain an editor of this adventure, but your ownership can only be restored by the new owner. The new owner will also be allowed to revoke your editing permissions.'
														: undefined
												}
												onChange={
													useFunction((event: { target: HTMLInputElement }) => {
														if (
															// The user finished editing the owner.
															event.target.value
															// They are transferring ownership from themself.
															&& ownerBeforeEdit === user.id
															// They are transferring ownership to someone else.
															&& event.target.value !== user.id
														) {
															setFieldValue('editors', uniq([
																...values.editors,
																// Add the user they are transferring ownership from to the editors.
																ownerBeforeEdit
																// Don't add the user they are transferring ownership to, because the user may edit the owner again, in which case the owner that was set temporarily would still be added as an editor. If the user did not intend to add them as an editor, that would be problematic, especially since the user would not even necessarily be aware the owner they set temporarily is still an editor.
															]));

															setOwnerBeforeEdit(event.target.value);
														}
													})
												}
											/>
										</LabeledGridRow>
										<LabeledGridRow
											labelProps={{
												className: 'user-array-field-label'
											}}
											label="Editors"
											help={'The users with permission to edit this adventure.\n\nOnly the owner is allowed to delete the adventure, change its owner, or change its editors. The owner has all permissions and will be publicly listed as an editor regardless of whether they are in the editor list.'}
										>
											<UserArrayField
												name="editors"
												unique
												readOnly={!ownerPerms}
											/>
										</LabeledGridRow>
										<LabeledGridField
											type="checkbox"
											name="allowComments"
											label="Allow Comments"
										/>
										<LabeledGridRow
											htmlFor={editingAnniversary ? 'field-anniversary-year' : undefined}
											label="Creation Date"
											help="This date is displayed publicly in your adventure info and used as the date for your anniversary banner."
										>
											{editingAnniversary ? (
												<DateField
													name="anniversary"
													required
													max={Date.now()}
												/>
											) : (
												<>
													<Timestamp className="spaced">
														{values.anniversary}
													</Timestamp>
													{ownerPerms && !story.anniversary.changed && (
														<EditButton
															className="spaced"
															title="Edit Creation Date"
															onClick={editAnniversary}
														/>
													)}
												</>
											)}
										</LabeledGridRow>
										<LabeledGridField
											type="url"
											name="banner"
											label="Banner URL"
											help={'A direct URL to an image of your adventure\'s anniversary banner. The recommended image size is 950x100 pixels.\n\nIf your adventure is public, is ongoing or complete, and has at least 200 favorites, this image will be displayed on the homepage for one week starting on the adventure\'s anniversary date.'}
											placeholder="Optional"
										/>
									</LabeledGridSection>
								</Columns>
								<Section id="story-editor-details" heading="Details">
									<Row>
										<TagField />
									</Row>
									<Row>
										<Label block htmlFor="field-description">
											Description
										</Label>
										<Field
											as="textarea"
											id="field-description"
											name="description"
											rows={4}
											maxLength={2000}
										/>
									</Row>
									<Row>
										<Label
											block
											htmlFor="field-sidebar-content"
											help={'This content is displayed in the sidebar to the left of your adventure info.\n\nUse this for links (typically on images) to your social media, music, credits, or other advertisements. Avoid using the description for this, or else it can show up in the adventure list and create unwanted clutter.\n\nThe recommend image width in the sidebar is 238 pixels.'}
										>
											Sidebar (External Links)
										</Label>
										<BBField
											name="sidebarContent"
											rows={4}
											maxLength={2000}
											keepHTMLTags
											placeholder={'Instead of putting external links in the description, put them here.\nClick the help button for more info.'}
										/>
									</Row>
								</Section>
								<Section id="story-editor-advanced" heading="Advanced" collapsible>
									<Columns id="story-editor-code-fields">
										<div>
											<Label block htmlFor="field-style">
												Custom Style
											</Label>
											<Field
												as="textarea"
												id="field-style"
												name="style"
												rows={8}
												placeholder={'Paste SCSS here.\nIf you don\'t know what this is, don\'t worry about it.'}
											/>
										</div>
										<div>
											<Label block htmlFor="field-style">
												Custom Script
											</Label>
											<Field
												as="textarea"
												id="field-script"
												name="script.unverified"
												rows={8}
												placeholder={'Paste JSX here.\nIf you don\'t know what this is, don\'t worry about it.'}
											/>
										</div>
									</Columns>
								</Section>
								<BottomActions>
									<Button
										type="submit"
										className="alt"
										disabled={!dirty || isSubmitting}
									>
										Save
									</Button>
									{ownerPerms && (
										<Button
											disabled={isSubmitting}
											onClick={deleteStory}
										>
											Delete
										</Button>
									)}
								</BottomActions>
							</Form>
						);
					}}
				</Formik>
			)}
		</Page>
	);

	return (
		<StoryIDContext.Provider value={story.id}>
			{pageComponent}
		</StoryIDContext.Provider>
	);
});

export default Component;

export const getServerSideProps = withStatusCode<ServerSideProps>(async ({ req, params }) => {
	const story = await getStoryByUnsafeID(params.storyID, undefined, true);

	if (!(
		story && req.user && (
			story.owner.equals(req.user._id)
			|| (
				story.editors.some(userID => userID.equals(req.user!._id))
				// Only owners can access their deleted stories.
				&& !story.willDelete
			)
			|| req.user.perms & Perm.sudoRead
		)
	)) {
		return { props: { statusCode: 403 } };
	}

	return {
		props: {
			story: getPrivateStory(story),
			userCache: await users.find!({
				_id: {
					$in: uniqBy([story.owner, ...story.editors], String)
				},
				willDelete: { $exists: false }
			}).map(getPublicUser).toArray()
		}
	};
});