import './styles.module.scss';
import Page from 'components/Page';
import { Perm } from 'modules/client/perms';
import { withErrorPage } from 'modules/client/errors';
import { withStatusCode } from 'modules/server/errors';
import { Field, Form, Formik } from 'formik';
import type { ChangeEvent } from 'react';
import { useCallback, useState } from 'react';
import { getChangedValues, useLeaveConfirmation } from 'modules/client/forms';
import Box from 'components/Box';
import BoxFooter from 'components/Box/BoxFooter';
import Button from 'components/Button';
import { getPrivateStory, getStoryByUnsafeID } from 'modules/server/stories';
import type { PrivateStory } from 'modules/client/stories';
import { StoryPrivacy, storyPrivacyNames, storyStatusNames } from 'modules/client/stories';
import BoxRowSection from 'components/Box/BoxRowSection';
import FieldBoxRow from 'components/Box/FieldBoxRow';
import BoxRow from 'components/Box/BoxRow';
import IconImage from 'components/IconImage';
import LabeledBoxRow from 'components/Box/LabeledBoxRow';
import UserField from 'components/UserField';
import type { PublicUser } from 'modules/client/users';
import { useUser } from 'modules/client/users';
import { useUserCache } from 'modules/client/UserCache';
import { uniq, uniqBy } from 'lodash';
import users, { getPublicUser } from 'modules/server/users';
import UserArrayField from 'components/UserField/UserArrayField';
import BoxColumns from 'components/Box/BoxColumns';
import BoxSection from 'components/Box/BoxSection';
import Label from 'components/Label';
import BBField from 'components/BBCode/BBField';
import Row from 'components/Row';
import TagField from 'components/TagField';
import type { APIClient } from 'modules/client/api';
import api from 'modules/client/api';
import DateField from 'components/DateField';
import Timestamp from 'components/Timestamp';
import EditButton from 'components/Button/EditButton';
import { Dialog } from 'modules/client/dialogs';

type StoryAPI = APIClient<typeof import('pages/api/stories/[storyID]').default>;

const getValuesFromStory = (privateStory: PrivateStory) => ({
	anniversary: new Date(0).setFullYear(
		privateStory.anniversary.year,
		privateStory.anniversary.month,
		privateStory.anniversary.day
	),
	title: privateStory.title,
	status: privateStory.status.toString(),
	privacy: privateStory.privacy.toString(),
	owner: privateStory.owner,
	editors: privateStory.editors,
	author: privateStory.author || {
		name: '',
		site: ''
	},
	description: privateStory.description,
	blurb: privateStory.blurb,
	icon: privateStory.icon,
	banner: privateStory.banner,
	style: privateStory.style,
	disableUserTheme: privateStory.disableUserTheme,
	script: privateStory.script,
	tags: privateStory.tags,
	commentsEnabled: privateStory.commentsEnabled
});

type Values = ReturnType<typeof getValuesFromStory>;

type ServerSideProps = {
	privateStory: PrivateStory,
	userCache: PublicUser[]
} | {
	statusCode: number
};

const Component = withErrorPage<ServerSideProps>(({
	privateStory: initialPrivateStory,
	userCache: initialUserCache
}) => {
	const [privateStory, setPrivateStory] = useState(initialPrivateStory);

	const { cacheUser } = useUserCache();
	initialUserCache.forEach(cacheUser);

	const user = useUser()!;

	const initialValues = getValuesFromStory(privateStory);

	const ownerPerms = (
		user.id === privateStory.owner
		|| !!(user.perms & Perm.sudoWrite)
	);

	const [editingAnniversary, setEditingAnniversary] = useState(false);

	const editAnniversary = useCallback(async () => {
		if (!await Dialog.confirm({
			id: 'edit-anniversary',
			title: 'Edit Anniversary',
			content: 'You can only change this adventure\'s anniversary date once.\n\nOnce changed, it cannot be undone.\n\nAre you sure you want to edit the anniversary date?'
		})) {
			return;
		}

		setEditingAnniversary(true);
	}, []);

	const [loadingRestore, setLoadingRestore] = useState(false);

	const restoreStory = useCallback(async () => {
		setLoadingRestore(true);

		const { data: newPrivateStory } = await (api as StoryAPI).put(`/stories/${privateStory.id}`, {
			willDelete: false
		}).finally(() => {
			setLoadingRestore(false);
		});

		setPrivateStory(newPrivateStory);
	}, [privateStory.id]);

	const onSubmit = useCallback(async (values: Values) => {
		const changedValues = getChangedValues(initialValues, values);

		if (!changedValues) {
			return;
		}

		const anniversaryDate = (
			changedValues.anniversary === undefined
				? undefined
				: new Date(changedValues.anniversary)
		);

		const { data: newPrivateStory } = await (api as StoryAPI).put(`/stories/${privateStory.id}`, {
			...changedValues,
			anniversary: anniversaryDate && {
				year: anniversaryDate.getFullYear(),
				month: anniversaryDate.getMonth(),
				day: anniversaryDate.getDate()
			},
			status: changedValues.status ? +changedValues.status : undefined,
			privacy: changedValues.privacy ? +changedValues.privacy : undefined
		});

		setPrivateStory(newPrivateStory);

		setEditingAnniversary(false);

		// This ESLint comment is necessary because the rule incorrectly thinks `initialValues` should be a dependency here, despite that it depends on `privateStory` which is already a dependency.
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [privateStory, initialValues]);

	const daysUntilDeletion = privateStory.willDelete !== undefined && (
		Math.round(
			(privateStory.willDelete - Date.now())
			/ (1000 * 60 * 60 * 24)
		)
	);

	return (
		<Page heading="Edit Adventure">
			{privateStory.willDelete ? (
				<>
					<Box>
						<BoxSection heading="Deleted Adventure">
							<BoxRow>
								<i>{privateStory.title}</i>
								{` will be permanently deleted in ~${daysUntilDeletion} day${daysUntilDeletion === 1 ? '' : 's'}.`}
							</BoxRow>
						</BoxSection>
					</Box>
					<BoxFooter>
						{ownerPerms && (
							<Button
								disabled={loadingRestore}
								onClick={restoreStory}
							>
								Restore
							</Button>
						)}
					</BoxFooter>
				</>
			) : (
				<Formik
					initialValues={initialValues}
					onSubmit={onSubmit}
					enableReinitialize
				>
					{({ isSubmitting, dirty, values, handleChange, setFieldValue, setSubmitting }) => {
						const shouldLeave = useLeaveConfirmation(dirty);

						const [ownerBeforeEdit, setOwnerBeforeEdit] = useState<string | undefined>(values.owner || privateStory.owner);

						const deleteStory = useCallback(async () => {
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
													I am sure I want to delete this adventure: <i>{privateStory.title}</i>
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

							const { data: newPrivateStory } = await (api as StoryAPI).put(`stories/${privateStory.id}`, {
								willDelete: true
							}).finally(() => {
								setSubmitting(false);
							});

							setPrivateStory(newPrivateStory);

							setEditingAnniversary(false);
						}, [shouldLeave, setSubmitting]);

						return (
							<Form>
								<Box>
									<BoxColumns>
										<BoxRowSection id="story-info" heading="Info">
											<FieldBoxRow
												name="title"
												label="Title"
												autoComplete="off"
												required
												maxLength={50}
											/>
											<FieldBoxRow
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
														{(storyStatusNames as any)[status]}
													</option>
												))}
											</FieldBoxRow>
											<FieldBoxRow
												as="select"
												name="privacy"
												label="Privacy"
												help={`${storyPrivacyNames[StoryPrivacy.Public]}: Anyone can see this adventure.\n${storyPrivacyNames[StoryPrivacy.Unlisted]}: Only users with this adventure's URL can see this adventure.\n${storyPrivacyNames[StoryPrivacy.Private]}: Only this adventure's owner and editors can see this adventure.`}
												required
												onChange={
													useCallback((event: ChangeEvent<HTMLSelectElement>) => {
														handleChange(event);

														if (+event.target.value !== StoryPrivacy.Public) {
															// If the story is not public, reset the anniversary date and banner URL fields so they can be safely hidden without unsaved changes.

															setFieldValue('anniversary', initialValues.anniversary);
															setFieldValue('banner', initialValues.banner);
														}
													}, [handleChange, setFieldValue])
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
											</FieldBoxRow>
											<FieldBoxRow
												type="url"
												name="icon"
												label="Icon URL"
												help="A direct URL to an image of your adventure's icon. The recommended image size is 150x150."
											/>
											<BoxRow>
												<IconImage
													id="story-icon"
													src={values.icon}
													alt="Your Adventure's Icon"
													title="Your Adventure's Icon"
												/>
											</BoxRow>
										</BoxRowSection>
										<BoxRowSection id="story-misc" heading="Misc">
											<LabeledBoxRow label="Owner">
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
														useCallback((event: { target: HTMLInputElement }) => {
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
														}, [ownerBeforeEdit, values.editors, setFieldValue])
													}
												/>
											</LabeledBoxRow>
											<LabeledBoxRow
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
											</LabeledBoxRow>
											<FieldBoxRow
												type="checkbox"
												name="commentsEnabled"
												label="Allow Comments"
											/>
											<LabeledBoxRow
												htmlFor={editingAnniversary ? 'field-anniversary-year' : ''}
												label="Anniversary Date"
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
														{ownerPerms && !privateStory.anniversary.changed && (
															<EditButton
																className="spaced"
																title="Edit Anniversary"
																onClick={editAnniversary}
															/>
														)}
													</>
												)}
											</LabeledBoxRow>
											<FieldBoxRow
												type="url"
												name="banner"
												label="Banner URL"
												help={'A direct URL to an image of your adventure\'s anniversary banner. The recommended image size is 940x90.\n\nIf your adventure is public, is ongoing or complete, and has at least 200 favorites, this image will be displayed on the homepage for one week starting on the adventure\'s anniversary date.'}
											/>
											<BoxRow>
												<Button href={`/s/${privateStory.id}/edit/p`}>
													Edit Pages
												</Button>
											</BoxRow>
										</BoxRowSection>
									</BoxColumns>
									<BoxSection id="story-details" heading="Details">
										<Row>
											<TagField rows={4} />
										</Row>
										<Row>
											<Label htmlFor="field-description">
												Description
											</Label>
											<BBField
												name="description"
												rows={6}
												maxLength={2000}
												html
											/>
										</Row>
										<Row>
											<Label
												htmlFor="field-blurb"
												help={'This text appears when you click "Show More" under an adventure\'s listing, and the first line of it is used in external embeds of this adventure.\n\nThis is useful if you have content in the description that is excessive for or doesn\'t need to be in the blurb.\n\nThis can usually be left empty to default to the adventure\'s description.'}
											>
												Blurb
											</Label>
											<Field
												as="textarea"
												id="field-blurb"
												name="blurb"
												rows={4}
												maxLength={2000}
												placeholder="This can usually be left empty to default to the adventure's description."
											/>
										</Row>
									</BoxSection>
									<BoxSection id="story-advanced" heading="Advanced" collapsible>
										<Row id="code-fields">
											<div>
												<Row>
													<Label htmlFor="field-style">
														Custom Style
													</Label>
													<Field
														as="textarea"
														id="field-style"
														name="style"
														rows={8}
														placeholder={'Paste SCSS here.\nIf you don\'t know what this is, don\'t worry about it.'}
													/>
												</Row>
												<Row>
													<Label
														htmlFor="field-disable-user-theme"
														help="When enabled, disables the user's theme and forces them to use only the standard theme with your custom stylesheet, so if you have heavy custom styling, you don't have to deal with overwriting different themes."
													>
														Disable User's Theme
													</Label>
													<Field
														type="checkbox"
														id="field-disable-user-theme"
														name="disableUserTheme"
													/>
												</Row>
											</div>
											<div>
												<Label htmlFor="field-style">
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
										</Row>
									</BoxSection>
									<BoxFooter>
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
									</BoxFooter>
								</Box>
							</Form>
						);
					}}
				</Formik>
			)}
		</Page>
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
			privateStory: getPrivateStory(story),
			userCache: await users.find!({
				_id: {
					$in: uniqBy([story.owner, ...story.editors], String)
				},
				willDelete: { $exists: false }
			}).map(getPublicUser).toArray()
		}
	};
});