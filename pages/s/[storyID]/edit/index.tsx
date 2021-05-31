import './styles.module.scss';
import Page from 'components/Page';
import { Perm } from 'modules/client/perms';
import { withErrorPage } from 'modules/client/errors';
import { withStatusCode } from 'modules/server/errors';
import { Field, Form, Formik } from 'formik';
import { useCallback, useState } from 'react';
import { useLeaveConfirmation } from 'modules/client/forms';
import Box from 'components/Box';
import BoxFooter from 'components/Box/BoxFooter';
import Button from 'components/Button';
import { getPrivateStory, getStoryByUnsafeID } from 'modules/server/stories';
import type { PrivateStory } from 'modules/client/stories';
import { storyStatusNames } from 'modules/client/stories';
import BoxRowSection from 'components/Box/BoxRowSection';
import FieldBoxRow from 'components/Box/FieldBoxRow';
import BoxRow from 'components/Box/BoxRow';
import IconImage from 'components/IconImage';
import LabeledBoxRow from 'components/Box/LabeledBoxRow';
import UserField from 'components/UserField';
import type { PublicUser } from 'modules/client/users';
import { useUser } from 'modules/client/users';
import { useUserCache } from 'modules/client/UserCache';
import { uniqBy } from 'lodash';
import users, { getPublicUser } from 'modules/server/users';
import UserArrayField from 'components/UserField/UserArrayField';
import BoxColumns from 'components/Box/BoxColumns';
import BoxSection from 'components/Box/BoxSection';
import Label from 'components/Label';
import BBField from 'components/BBCode/BBField';
import Row from 'components/Row';
import Timestamp from 'components/Timestamp';

const getValuesFromStory = (privateStory: PrivateStory) => ({
	created: privateStory.created,
	title: privateStory.title,
	status: privateStory.status.toString(),
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

	const ownerWritePerm = (
		user.id === privateStory.owner
		|| user.perms & Perm.sudoWrite
	);

	return (
		<Page flashyTitle heading="Edit Adventure">
			<Formik
				initialValues={initialValues}
				onSubmit={
					useCallback(async (values: Values) => {

					}, [])
				}
				enableReinitialize
			>
				{({ isSubmitting, dirty, values }) => {
					useLeaveConfirmation(dirty);

					return (
						<Form>
							<Box>
								<BoxColumns>
									<BoxRowSection heading="Info">
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
									<BoxRowSection heading="Misc">
										<LabeledBoxRow label="Owner">
											<UserField
												name="owner"
												required
												readOnly={!ownerWritePerm}
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
												readOnly={!ownerWritePerm}
											/>
										</LabeledBoxRow>
										<FieldBoxRow
											type="checkbox"
											name="commentsEnabled"
											label="Allow Comments"
										/>
										<FieldBoxRow
											type="url"
											name="banner"
											label="Banner URL"
											help={(
												<>
													A direct URL to an image of your adventure's anniversary banner. The recommended image size is 940x90.<br />
													<br />
													If your adventure is ongoing or complete and has at least 200 favorites, this image will be displayed on the homepage for one week starting on the adventure's anniversary.<br />
													<br />
													This adventure's creation date is set to <Timestamp>{values.created}</Timestamp> and will be used as its anniversary.
												</>
											)}
										/>
									</BoxRowSection>
								</BoxColumns>
								<BoxSection heading="Details">
									<Row>
										<Label htmlFor="field-tags">
											Tags
										</Label>
										(Not Implemented Yet)
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
								</BoxSection>
								<BoxSection heading="Advanced" collapsible>
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
													placeholder={"Paste SCSS here.\nIf you don't know what this is, don't worry about it."}
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
												placeholder={"Paste JSX here.\nIf you don't know what this is, don't worry about it."}
											/>
										</div>
									</Row>
									<Row>
										<Label
											htmlFor="field-blurb"
											help={'This text appears when you click "Show More" under an adventure\'s listing, and the first line of this will be used in external embeds of this adventure.\n\nIt is usually recommended that you leave this empty to default to the adventure\'s description.'}
										>
											Blurb
										</Label>
										<BBField
											name="blurb"
											rows={6}
											maxLength={2000}
											placeholder="It is usually recommended that you leave this empty to default to the adventure's description."
										/>
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
								</BoxFooter>
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
			privateStory: getPrivateStory(story),
			userCache: await users.find!({
				_id: {
					$in: uniqBy([story.owner, ...story.editors], String)
				}
			}).map(getPublicUser).toArray()
		}
	};
});