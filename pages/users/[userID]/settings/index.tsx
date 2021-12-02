import Page from 'components/Page';
import { setUser, setUserMerge, getUser } from 'lib/client/reactContexts/UserContext';
import type { PrivateUser } from 'lib/client/users';
import { Perm } from 'lib/client/perms';
import { permToGetUserInPage } from 'lib/server/users/permToGetUser';
import { getPrivateUser } from 'lib/server/users';
import { preventReloads, withErrorPage } from 'lib/client/errors';
import withStatusCode from 'lib/server/withStatusCode';
import { Form, Formik, Field } from 'formik';
import { useEffect, useState } from 'react';
import useFunction from 'lib/client/reactHooks/useFunction';
import { getChangedValues, preventLeaveConfirmations, useLeaveConfirmation } from 'lib/client/forms';
import Columns from 'components/Columns';
import Section from 'components/Section';
import LabeledGridSection from 'components/Section/LabeledGridSection';
import LabeledGridField from 'components/LabeledGrid/LabeledGridField';
import NotificationSettingGrid from 'components/Setting/NotificationSettingGrid';
import NotificationSetting from 'components/Setting/NotificationSetting';
import ControlSetting from 'components/Setting/ControlSetting';
import BottomActions from 'components/BottomActions';
import Button from 'components/Button';
import api from 'lib/client/api';
import type { APIClient } from 'lib/client/api';
import { escapeRegExp, isEqual } from 'lodash';
import Dialog from 'lib/client/Dialog';
import Label from 'components/Label';
import Router from 'next/router';
import Row from 'components/Row';
import LabeledGrid from 'components/LabeledGrid';
import ForgotPassword from 'components/ForgotPassword';
import AuthMethods from 'components/AuthMethod/AuthMethods';
import BirthdateGridRow from 'components/LabeledGrid/LabeledGridRow/BirthdateGridRow';
import type { integer } from 'lib/types';
import useSubmitOnSave from 'lib/client/reactHooks/useSubmitOnSave';
import defaultUserSettings from 'lib/client/defaultUserSettings';

type UserAPI = APIClient<typeof import('pages/api/users/[userID]').default>;
type UserAuthMethodsAPI = APIClient<typeof import('pages/api/users/[userID]/authMethods').default>;
type UserPasswordAPI = APIClient<typeof import('pages/api/users/[userID]/authMethods/password').default>;
type UserDoesOwnStoriesAPI = APIClient<typeof import('pages/api/users/[userID]/doesOwnStories').default>;

const getSettingsValues = (settings: PrivateUser['settings']) => ({
	autoOpenSpoilers: settings.autoOpenSpoilers,
	stickyNav: settings.stickyNav,
	imageAliasing: settings.imageAliasing,
	theme: settings.theme,
	style: settings.style,
	controls: settings.controls,
	notifications: {
		messages: settings.notifications.messages,
		userTags: settings.notifications.userTags,
		commentReplies: settings.notifications.commentReplies,
		storyDefaults: settings.notifications.storyDefaults
	}
});

const getValuesFromUser = (privateUser: PrivateUser) => ({
	email: privateUser.email,
	birthdate: privateUser.birthdate,
	settings: getSettingsValues(privateUser.settings)
});

type Values = ReturnType<typeof getValuesFromUser>;

let defaultUserSettingsValues: ReturnType<typeof getSettingsValues> | undefined;

let formChanged = false;

const onFormChange = () => {
	formChanged = true;
};

type ServerSideProps = {
	initialPrivateUser: PrivateUser
} | {
	statusCode: integer
};

const Component = withErrorPage<ServerSideProps>(({ initialPrivateUser }) => {
	const [privateUser, setPrivateUser] = useState(initialPrivateUser);

	if (!defaultUserSettingsValues) {
		defaultUserSettingsValues = getSettingsValues(defaultUserSettings);
	}

	const initialValues = getValuesFromUser(privateUser);

	useEffect(() => () => {
		// The page unmounted, so reset the previewed unsaved settings.
		setUserMerge(undefined);
	}, []);

	const onClickChangePassword = useFunction(async () => {
		const { data: authMethods } = await (api as UserAuthMethodsAPI).get(`users/${privateUser.id}/authMethods`, {
			params: {
				type: 'password'
			}
		});

		if (authMethods.length === 0) {
			new Dialog({
				id: 'change-password',
				title: 'Error',
				content: 'Your account does not use a password to sign in. If you want to add a password to your account, select "Edit Sign-In Methods" and add a password there instead.'
			});
			return;
		}

		const changePasswordDialog = new Dialog({
			id: 'change-password',
			title: 'Change Password',
			initialValues: {
				currentPassword: '' as string,
				password: '' as string,
				confirmPassword: '' as string
			},
			content: ({ values }) => (
				<LabeledGrid>
					<LabeledGridField
						type="password"
						name="currentPassword"
						label="Current Password"
						autoComplete="current-password"
						required
						minLength={8}
						autoFocus
					/>
					<ForgotPassword />
					<LabeledGridField
						type="password"
						name="password"
						label="New Password"
						autoComplete="new-password"
						required
						minLength={8}
					/>
					<LabeledGridField
						type="password"
						name="confirmPassword"
						label="Confirm"
						autoComplete="new-password"
						required
						placeholder="Re-Type Password"
						pattern={escapeRegExp(values.password)}
					/>
				</LabeledGrid>
			),
			actions: [
				{ label: 'Okay', autoFocus: false },
				'Cancel'
			]
		});

		if ((await changePasswordDialog)?.submit) {
			await (api as UserPasswordAPI).patch(`/users/${privateUser.id}/authMethods/password`, {
				currentPassword: changePasswordDialog.form!.values.currentPassword,
				newPassword: changePasswordDialog.form!.values.password
			});

			new Dialog({
				title: 'Change Password',
				content: 'Success! Your password has been changed.'
			});
		}
	});

	// The hooks immediately above and below cannot be inline and must be defined in this scope, because this scope is where `privateUser.id` (the dependency of those callbacks) can be checked for updates at a minimal frequency.

	const onClickEditAuthMethods = useFunction(async () => {
		const { data: authMethods } = await (api as UserAuthMethodsAPI).get(`users/${privateUser.id}/authMethods`);

		new Dialog({
			id: 'auth-methods',
			title: 'Edit Sign-In Methods',
			content: <AuthMethods userID={privateUser.id} authMethods={authMethods} />,
			actions: [
				{ label: 'Done', autoFocus: false }
			]
		});
	});

	return (
		<Page withFlashyTitle heading="Settings">
			<Formik
				initialValues={initialValues}
				onSubmit={
					useFunction(async (values: Values) => {
						const changedValues = getChangedValues(initialValues, values);

						if (!changedValues) {
							return;
						}

						const { data } = await (api as UserAPI).patch(
							`users/${privateUser.id}`,
							changedValues
						);

						setPrivateUser(data);

						if (getUser()!.id === privateUser.id) {
							setUser(data);
						}
					})
				}
				enableReinitialize
			>
				{({ isSubmitting, dirty, values, setFieldValue, setSubmitting, submitForm }) => {
					useLeaveConfirmation(dirty);

					useEffect(() => {
						if (formChanged) {
							formChanged = false;

							// Preview the unsaved settings by merging them with the user state.
							setUserMerge({ settings: values.settings });
						}
					});

					return (
						<Form
							onChange={onFormChange}
							ref={useSubmitOnSave({ submitForm, dirty, isSubmitting })}
						>
							<LabeledGridSection heading="Account">
								<LabeledGridField
									type="email"
									name="email"
									label="Email"
									autoComplete="email"
									required
									maxLength={254}
								/>
								<BirthdateGridRow
									birthdateChanged={privateUser.birthdateChanged}
								/>
								<Row>
									{/* This button should remain visible even for those who do not have a password sign-in method, because those users may think they do regardless, and they should be informed that they don't upon clicking this button, to minimize confusion to those users. */}
									<Button
										className="small"
										onClick={onClickChangePassword}
									>
										Change Password
									</Button>
								</Row>
								<Row>
									<Button
										className="small"
										onClick={onClickEditAuthMethods}
									>
										Edit Sign-In Methods
									</Button>
								</Row>
							</LabeledGridSection>
							<LabeledGridSection heading="General">
								<LabeledGridField
									as="select"
									name="settings.theme"
									label="Theme"
								>
									<option value="standard">Standard</option>
									<option value="dark">Dark</option>
									<option value="felt">Felt</option>
									<option value="sah">Sweet and Hella</option>
								</LabeledGridField>
								<LabeledGridField
									type="checkbox"
									name="settings.stickyNav"
									label="Sticky Nav Bar"
									help="Makes the nav bar stick to the top of your screen when you scroll down instead of scrolling out of the page."
								/>
								<LabeledGridField
									type="checkbox"
									name="settings.autoOpenSpoilers"
									label="Auto-Open Spoilers"
									help="Makes spoilers open by default instead of closed."
								/>
								<LabeledGridField
									type="checkbox"
									name="settings.imageAliasing"
									// This setting's label should not use terminology less obscure than "Aliasing", because if its phrasing is less obscure (for example if it were called "Crisp Images" or "Image Sharpening"), it would be easily misinterpretable and lead to misunderstandings about what the setting does, even among users who know what aliasing is, since it wouldn't be called that. With this more obscure but more accurate name, it is much less likely that inaccurate assumptions would be made about the meaning, and users would be more inclined to click the help button for clarity.
									label="Image Aliasing"
									help={'Disables anti-aliasing in images on adventure pages (by using nearest-neighbor scaling).\n\nWhat this means is images, when scaled, will tend to have more crisp edges rather than becoming blurry. It disables the browser\'s smooth scaling effect that causes scaled images to blur.'}
								/>
							</LabeledGridSection>
							<Columns ofSections>
								<Section heading="General Notifications">
									<NotificationSettingGrid>
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
											label="Comment Replies"
											help="Get notified when one of your comments receives a reply."
										/>
									</NotificationSettingGrid>
								</Section>
								<Section heading="Default Adventure Notifications">
									<NotificationSettingGrid>
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
									</NotificationSettingGrid>
								</Section>
							</Columns>
							<LabeledGridSection heading="Controls">
								<ControlSetting
									name="settings.controls.previousPage"
									label="Previous Page"
								/>
								<ControlSetting
									name="settings.controls.nextPage"
									label="Next Page"
								/>
								<ControlSetting
									name="settings.controls.toggleSpoilers"
									label="Toggle Spoilers"
								/>
							</LabeledGridSection>
							<Section heading="Advanced" collapsible>
								<Label block htmlFor="field-style">
									Custom Site Style
								</Label>
								<Field
									as="textarea"
									id="field-style"
									name="settings.style"
									rows={5}
									placeholder={'Paste SCSS here.\nIf you don\'t know what this is, don\'t worry about it.'}
								/>
							</Section>
							<BottomActions>
								<Row>
									<Button
										type="submit"
										className="alt"
										disabled={!dirty || isSubmitting}
									>
										Save
									</Button>
									<Button
										title="Reset Settings to Default"
										disabled={isEqual(values.settings, defaultUserSettingsValues)}
										onClick={
											useFunction(async () => {
												if (await Dialog.confirm({
													id: 'reset-settings',
													title: 'Reset Settings',
													content: 'Are you sure you want to reset your settings to default?\n\nAll unsaved changes will be lost.'
												})) {
													setFieldValue('settings', defaultUserSettingsValues);
													onFormChange();
												}
											})
										}
									>
										Reset
									</Button>
								</Row>
								<Row>
									<Button
										disabled={isSubmitting}
										onClick={
											useFunction(async () => {
												setSubmitting(true);

												const { data: doesOwnStories } = await (api as UserDoesOwnStoriesAPI).get(`users/${privateUser.id}/doesOwnStories`).catch(error => {
													setSubmitting(false);
													return Promise.reject(error);
												});

												setSubmitting(false);

												if (doesOwnStories) {
													new Dialog({
														id: 'delete-user',
														title: 'Delete Account',
														content: 'If you want to delete your account, first delete or transfer ownership of each of the adventures you own.'
													});

													return;
												}

												if (!await Dialog.confirm({
													id: 'delete-user',
													title: 'Delete Account',
													content: (
														<>
															Are you sure you want to delete your account?<br />
															<br />
															Your account will be restored if you sign into it within 30 days after deletion.<br />
															<br />
															If you do not sign into your account within 30 days, <span className="bolder red">the deletion will be irreversible.</span><br />
															<br />
															<label>
																<input
																	type="checkbox"
																	className="spaced"
																	required
																	autoFocus
																/>
																<span className="spaced bolder">
																	I am sure I want to delete my account: <i>{privateUser.name}</i>
																</span>
															</label>
														</>
													),
													actions: [
														{ label: 'Yes', autoFocus: false },
														'No'
													]
												})) {
													return;
												}

												setSubmitting(true);

												await (api as UserAPI).delete(`users/${privateUser.id}`).catch(error => {
													setSubmitting(false);
													return Promise.reject(error);
												});

												if (getUser()!.id === privateUser.id) {
													// We don't want to reload when they sign out; we want to go to the homepage.
													preventReloads();
													setUser(undefined);
												}

												preventLeaveConfirmations();
												Router.push('/');
											})
										}
									>
										Delete Account
									</Button>
								</Row>
							</BottomActions>
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
			initialPrivateUser: getPrivateUser(user!)
		}
	};
});