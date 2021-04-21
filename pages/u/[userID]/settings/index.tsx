import Page from 'components/Page';
import { setUser, setUserMerge, useUser } from 'modules/client/users';
import type { PrivateUser } from 'modules/client/users';
import { Perm, permToGetUserInPage } from 'modules/server/perms';
import { defaultUser, getPrivateUser } from 'modules/server/users';
import { preventReloads, withErrorPage } from 'modules/client/errors';
import { withStatusCode } from 'modules/server/errors';
import { Form, Formik, Field } from 'formik';
import { useCallback, useEffect, useState } from 'react';
import { getChangedValues, preventLeaveConfirmations, useLeaveConfirmation } from 'modules/client/forms';
import Grid from 'components/Grid';
import ColumnGrid from 'components/Grid/ColumnGrid';
import GridSection from 'components/Grid/GridSection';
import GridRowSection from 'components/Grid/GridRowSection';
import FieldGridRow from 'components/Grid/FieldGridRow';
import NotificationSettingGroup from 'components/Setting/NotificationSettingGroup';
import NotificationSetting from 'components/Setting/NotificationSetting';
import ControlSetting from 'components/Setting/ControlSetting';
import GridFooter from 'components/Grid/GridFooter';
import Button from 'components/Button';
import api from 'modules/client/api';
import type { APIClient } from 'modules/client/api';
import _ from 'lodash';
import { Dialog } from 'modules/client/dialogs';
import Label from 'components/Label';
import Router from 'next/router';
import GridRow from 'components/Grid/GridRow';
import './styles.module.scss';

type UserAPI = APIClient<typeof import('pages/api/users/[userID]').default>;

const getValuesFromUser = (privateUser: Pick<PrivateUser, 'settings'> & Partial<Omit<PrivateUser, 'settings'>>) => ({
	email: privateUser.email,
	settings: {
		ads: privateUser.settings.ads,
		autoOpenSpoilers: privateUser.settings.autoOpenSpoilers,
		preloadImages: privateUser.settings.preloadImages,
		stickyNav: privateUser.settings.stickyNav,
		imageSharpening: privateUser.settings.imageSharpening,
		theme: privateUser.settings.theme,
		style: privateUser.settings.style,
		controls: privateUser.settings.controls,
		notifications: {
			messages: privateUser.settings.notifications.messages,
			userTags: privateUser.settings.notifications.userTags,
			commentReplies: privateUser.settings.notifications.commentReplies,
			storyDefaults: privateUser.settings.notifications.storyDefaults
		}
	}
});

type Values = ReturnType<typeof getValuesFromUser>;

let defaultValues: Values | undefined;

let formChanged = false;

const onFormChange = () => {
	formChanged = true;
};

type ServerSideProps = {
	initialPrivateUser: PrivateUser,
	defaultSettings: PrivateUser['settings']
} | {
	statusCode: number
};

const Component = withErrorPage<ServerSideProps>(({ initialPrivateUser, defaultSettings }) => {
	const [privateUser, setPrivateUser] = useState(initialPrivateUser);
	const user = useUser()!;

	if (!defaultValues) {
		defaultValues = getValuesFromUser({ settings: defaultSettings });
	}

	const initialValues = getValuesFromUser(privateUser);

	useEffect(() => () => {
		// The page unmounted, so reset the previewed unsaved settings.
		setUserMerge(undefined);
	}, []);

	return (
		<Page flashyTitle heading="Settings">
			<Formik
				initialValues={initialValues}
				onSubmit={
					useCallback(async (values: Values) => {
						const changedValues = getChangedValues(initialValues, values);

						if (!changedValues) {
							return;
						}

						const { data } = await (api as UserAPI).put(
							`users/${privateUser.id}`,
							changedValues
						);

						setPrivateUser(data);
						if (user.id === privateUser.id) {
							setUser(data);
						}

						// This ESLint comment is necessary because the rule incorrectly thinks `initialValues` should be a dependency here, despite that `initialValues` depends on `privateUser` which is already a dependency.
						// eslint-disable-next-line react-hooks/exhaustive-deps
					}, [privateUser, user])
				}
				enableReinitialize
			>
				{({ isSubmitting, dirty, values, setFieldValue, setSubmitting }) => {
					useLeaveConfirmation(dirty);

					useEffect(() => {
						if (formChanged) {
							formChanged = false;

							// Preview the unsaved settings by merging them with the user state.
							setUserMerge({ settings: values.settings });
						}
					});

					return (
						<Form onChange={onFormChange}>
							<Grid>
								<GridRowSection heading="Account">
									<FieldGridRow
										name="email"
										type="email"
										autoComplete="email"
										required
										maxLength={254}
										label="Email"
									/>
									<GridRow>
										<Button className="small">Edit Sign-In Methods</Button>
									</GridRow>
								</GridRowSection>
								<GridRowSection heading="Display">
									<FieldGridRow
										as="select"
										name="settings.theme"
										label="Theme"
									>
										<option value="standard">Standard</option>
										<option value="dark">Dark</option>
										<option value="felt">Felt</option>
										<option value="sbahj">SBaHJ</option>
										<option value="trickster">Trickster</option>
									</FieldGridRow>
									<FieldGridRow
										name="settings.stickyNav"
										label="Sticky Nav Bar"
										help="Makes the nav bar stick to the top of your screen when you scroll down instead of scrolling out of the page."
									/>
									<FieldGridRow
										name="settings.imageSharpening"
										label="Image Sharpening"
										help={'Disables anti-aliasing in images from adventure pages (using nearest-neighbor scaling).\n\nWhat this means is images, when scaled, will tend to have more crisp edges rather than becoming blurry.'}
									/>
									<FieldGridRow
										name="settings.ads.side"
										label="Side Ad"
									/>
									<FieldGridRow
										name="settings.ads.matchedContent"
										label="Matched Content Ad"
									/>
								</GridRowSection>
								<GridRowSection heading="Utility">
									<FieldGridRow
										name="settings.autoOpenSpoilers"
										label="Auto-Open Spoilers"
										help="Makes spoilers open by default instead of closed."
									/>
									<FieldGridRow
										name="settings.preloadImages"
										label="Preload Images"
										help="Loads images on adjacent adventure pages so they may already be loaded when an adjacent page is opened."
									/>
								</GridRowSection>
								<ColumnGrid>
									<NotificationSettingGroup heading="General Notifications">
										<NotificationSetting
											name="settings.notifications.messages"
											label="Messages"
											help="Get notified when a user sends you a new private message."
										/>
										<NotificationSetting
											name="settings.notifications.userTags"
											label="User Tags"
											help="Get notified when you are tagged in a comment."
										/>
										<NotificationSetting
											name="settings.notifications.commentReplies"
											label="Replies to Comments"
											help="Get notified when one of your comments receives a reply."
										/>
									</NotificationSettingGroup>
									<NotificationSettingGroup heading="Default Adventure Notifications">
										<NotificationSetting
											name="settings.notifications.storyDefaults.updates"
											label="Updates"
											help="Get notified when an adventure publishes new pages."
										/>
										<NotificationSetting
											name="settings.notifications.storyDefaults.news"
											label="News"
											help="Get notified when an adventure publishes a news post."
										/>
										<NotificationSetting
											name="settings.notifications.storyDefaults.comments"
											label="Comments"
											help="Get notified when an adventure you edit receives a new comment."
										/>
									</NotificationSettingGroup>
								</ColumnGrid>
								<GridRowSection heading="Controls">
									<GridRow className="translucent-text">
										Select a box and press a key. Press escape to remove a control.
									</GridRow>
									<ControlSetting
										name="settings.controls.back"
										label="Back"
									/>
									<ControlSetting
										name="settings.controls.forward"
										label="Forward"
									/>
									<ControlSetting
										name="settings.controls.toggleSpoilers"
										label="Toggle Spoilers"
									/>
								</GridRowSection>
								<GridSection heading="Advanced">
									<Label htmlFor="field-style">
										Custom Site Style
									</Label>
									<Field
										as="textarea"
										id="field-style"
										name="settings.style"
										rows={5}
										placeholder={"Paste SCSS here.\nIf you don't know what this is, don't worry about it."}
									/>
								</GridSection>
								<GridFooter>
									<GridRow>
										<Button
											className="alt"
											type="submit"
											disabled={isSubmitting || !dirty}
										>
											Save
										</Button>
										<Button
											title="Reset settings to default"
											disabled={_.isEqual(values.settings, defaultValues!.settings)}
											onClick={
												useCallback(() => {
													new Dialog({
														id: 'reset',
														title: 'Reset',
														content: 'Are you sure you want to reset your settings to default?\n\nAny unsaved changes will be lost.',
														actions: ['Yes', 'No']
													}).then(result => {
														if (result?.submit) {
															setFieldValue('settings', defaultValues!.settings);
															onFormChange();
														}
													});
												}, [setFieldValue])
											}
										>
											Reset
										</Button>
									</GridRow>
									<GridRow>
										<Button
											disabled={isSubmitting}
											onClick={
												useCallback(async () => {
													if (!(
														(
															await new Dialog({
																id: 'delete-user',
																title: 'Delete Account',
																content: 'Are you sure you want to delete your account?\n\nThis action is irreversible.',
																actions: [
																	'Yes',
																	{ label: 'No', focus: true }
																]
															})
														)?.submit
														&& (
															await new Dialog({
																id: 'delete-user',
																title: 'Delete Account',
																content: <>
																	Are you REALLY sure you want to delete your account?<br />
																	<br />
																	This action is IRREVERSIBLE.<br />
																	<br />
																	<Field
																		id="delete-user-confirm"
																		name="confirm"
																		type="checkbox"
																		required
																	/>
																	<label className="spaced bolder" htmlFor="delete-user-confirm">
																		I am sure I want to delete my account: {privateUser.name}
																	</label>
																</>,
																actions: [
																	'Yes',
																	{ label: 'No', focus: true }
																]
															})
														)?.submit
													)) {
														return;
													}

													setSubmitting(true);

													(api as UserAPI).delete(`users/${privateUser.id}`).then(() => {
														if (user.id === privateUser.id) {
															preventReloads();
															setUser(undefined);
														}

														preventLeaveConfirmations();
														Router.push('/');
													}).catch(() => {
														setSubmitting(false);
													});
												}, [setSubmitting])
											}
										>
											Delete Account
										</Button>
									</GridRow>
								</GridFooter>
							</Grid>
						</Form>
					);
				}}
			</Formik>
		</Page>
	);
});

export default Component;

export const getServerSideProps = withStatusCode<ServerSideProps>(async ({ req, params }) => {
	const { user, statusCode } = await permToGetUserInPage(req, params.userID, Perm.sudoRead);

	if (statusCode) {
		return { props: { statusCode } };
	}

	return {
		props: {
			initialPrivateUser: getPrivateUser(user!),
			defaultSettings: defaultUser.settings
		}
	};
});