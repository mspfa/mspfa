import Page from 'components/Page';
import { setUser, setUserMerge, defaultSettings, getUser } from 'modules/client/users';
import type { PrivateUser } from 'modules/client/users';
import { Perm } from 'modules/client/perms';
import { permToGetUserInPage } from 'modules/server/perms';
import { getPrivateUser } from 'modules/server/users';
import { preventReloads, withErrorPage } from 'modules/client/errors';
import { withStatusCode } from 'modules/server/errors';
import { Form, Formik, Field } from 'formik';
import { useCallback, useEffect, useState } from 'react';
import type { ChangeEvent } from 'react';
import { getChangedValues, preventLeaveConfirmations, useLeaveConfirmation } from 'modules/client/forms';
import Box from 'components/Box';
import BoxColumns from 'components/Box/BoxColumns';
import BoxSection from 'components/Box/BoxSection';
import BoxRowSection from 'components/Box/BoxRowSection';
import FieldBoxRow from 'components/Box/FieldBoxRow';
import NotificationSettingGroup from 'components/Setting/NotificationSettingGroup';
import NotificationSetting from 'components/Setting/NotificationSetting';
import ControlSetting from 'components/Setting/ControlSetting';
import BoxFooter from 'components/Box/BoxFooter';
import Button from 'components/Button';
import api from 'modules/client/api';
import type { APIClient } from 'modules/client/api';
import { escapeRegExp, isEqual } from 'lodash';
import { Dialog } from 'modules/client/dialogs';
import Label from 'components/Label';
import Router from 'next/router';
import BoxRow from 'components/Box/BoxRow';
import LabeledDialogBox from 'components/Box/LabeledDialogBox';
import ForgotPassword from 'components/ForgotPassword';
import AuthMethods from 'components/AuthMethod/AuthMethods';
import LabeledBoxRow from 'components/Box/LabeledBoxRow';
import BirthdateField from 'components/DateField/BirthdateField';
import { useDeepCompareEffect } from 'react-use';
import Timestamp from 'components/Timestamp';
import EditButton from 'components/Button/EditButton';

type UserAPI = APIClient<typeof import('pages/api/users/[userID]').default>;
type AuthMethodsAPI = APIClient<typeof import('pages/api/users/[userID]/authMethods').default>;
type PasswordAPI = APIClient<typeof import('pages/api/users/[userID]/authMethods/password').default>;
type DoesOwnStoriesAPI = APIClient<typeof import('pages/api/users/[userID]/doesOwnStories').default>;

const getSettingsValues = (settings: PrivateUser['settings']) => ({
	ads: settings.ads,
	autoOpenSpoilers: settings.autoOpenSpoilers,
	preloadImages: settings.preloadImages,
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

let defaultSettingsValues: ReturnType<typeof getSettingsValues> | undefined;

let formChanged = false;

const onFormChange = () => {
	formChanged = true;
};

type ServerSideProps = {
	initialPrivateUser: PrivateUser
} | {
	statusCode: number
};

const Component = withErrorPage<ServerSideProps>(({ initialPrivateUser }) => {
	const [privateUser, setPrivateUser] = useState(initialPrivateUser);

	if (!defaultSettingsValues) {
		defaultSettingsValues = getSettingsValues(defaultSettings);
	}

	const initialValues = getValuesFromUser(privateUser);

	useDeepCompareEffect(() => () => {
		// The page unmounted (or saved settings due to a change in `initialValues`), so reset the previewed unsaved settings.
		setUserMerge(undefined);
	}, [initialValues]);

	const onClickChangePassword = useCallback(async () => {
		const { data: authMethods } = await (api as AuthMethodsAPI).get(`users/${privateUser.id}/authMethods`, {
			params: {
				type: 'password'
			}
		});

		if (!authMethods.length) {
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
				<LabeledDialogBox>
					<FieldBoxRow
						type="password"
						name="currentPassword"
						label="Current Password"
						autoComplete="current-password"
						required
						minLength={8}
						autoFocus
					/>
					<ForgotPassword />
					<FieldBoxRow
						type="password"
						name="password"
						label="New Password"
						autoComplete="new-password"
						required
						minLength={8}
					/>
					<FieldBoxRow
						type="password"
						name="confirmPassword"
						label="Confirm"
						autoComplete="new-password"
						required
						placeholder="Re-Type Password"
						pattern={escapeRegExp(values.password)}
					/>
				</LabeledDialogBox>
			),
			actions: [
				{ label: 'Okay', autoFocus: false },
				'Cancel'
			]
		});

		if ((await changePasswordDialog)?.submit) {
			await (api as PasswordAPI).put(`/users/${privateUser.id}/authMethods/password`, {
				currentPassword: changePasswordDialog.form!.values.currentPassword,
				newPassword: changePasswordDialog.form!.values.password
			});

			new Dialog({
				title: 'Change Password',
				content: 'Success! Your password has been changed.'
			});
		}
	}, [privateUser.id]);

	// The hooks immediately above and below cannot be inline and must be defined in this scope, because this scope is where `privateUser.id` (the dependency of those callbacks) can be checked for updates at a minimal frequency.

	const onClickEditAuthMethods = useCallback(async () => {
		const { data: authMethods } = await (api as AuthMethodsAPI).get(`users/${privateUser.id}/authMethods`);

		new Dialog({
			id: 'auth-methods',
			title: 'Edit Sign-In Methods',
			content: <AuthMethods userID={privateUser.id} authMethods={authMethods} />,
			actions: [
				{ label: 'Done', autoFocus: false }
			]
		});
	}, [privateUser.id]);

	const [editingBirthdate, setEditingBirthdate] = useState(false);

	const editBirthdate = useCallback(async () => {
		if (!await Dialog.confirm({
			id: 'edit-birthdate',
			title: 'Edit Birthdate',
			content: 'You can only change your birthdate once.\n\nOnce changed, it cannot be undone.\n\nAre you sure you want to edit your birthdate?'
		})) {
			return;
		}

		setEditingBirthdate(true);
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

						setEditingBirthdate(false);

						if (getUser()!.id === privateUser.id) {
							setUser(data);
						}

						// This ESLint comment is necessary because the rule incorrectly thinks `initialValues` should be a dependency here, despite that it depends on `privateUser` which is already a dependency.
						// eslint-disable-next-line react-hooks/exhaustive-deps
					}, [privateUser])
				}
				enableReinitialize
			>
				{({ isSubmitting, dirty, values, setFieldValue, setSubmitting, handleChange }) => {
					useLeaveConfirmation(dirty);

					useEffect(() => {
						if (formChanged) {
							formChanged = false;

							// Preview the unsaved settings by merging them with the user state.
							setUserMerge({ settings: values.settings });
						}
					});

					const interceptAdDisable = useCallback(async (event: ChangeEvent<{ name: string }>) => {
						if (await Dialog.confirm({
							id: 'disable-ad',
							title: 'Disable Ads',
							content: 'Ads are how we earn money, how we fund the website. By disabling this ad, a fraction of our funds are decreased.\n\nWe\'re okay with that if you don\'t think it\'s worth the unpleasant visual experience, but please first consider the effect of it.',
							actions: [
								'I understand the impact of my decision and wish to proceed.',
								{ label: 'Cancel', autoFocus: true }
							]
						})) {
							setFieldValue(event.target.name, false);
						}
					}, [setFieldValue]);

					return (
						<Form onChange={onFormChange}>
							<Box>
								<BoxRowSection heading="Account">
									<FieldBoxRow
										type="email"
										name="email"
										label="Email"
										autoComplete="email"
										required
										maxLength={254}
									/>
									<LabeledBoxRow
										htmlFor={editingBirthdate ? 'field-birthdate-year' : ''}
										label="Birthdate"
									>
										{editingBirthdate ? (
											<BirthdateField required />
										) : (
											<>
												<Timestamp className="spaced">
													{values.birthdate}
												</Timestamp>
												{!privateUser.birthdateChanged && (
													<EditButton
														className="spaced"
														title="Edit Birthdate"
														onClick={editBirthdate}
													/>
												)}
											</>
										)}
									</LabeledBoxRow>
									<BoxRow>
										{/* This button should remain visible even for those who do not have a password sign-in method, because those users may think they do regardless, and they should be informed that they don't upon clicking this button, to minimize confusion to those users. */}
										<Button
											className="small"
											onClick={onClickChangePassword}
										>
											Change Password
										</Button>
									</BoxRow>
									<BoxRow>
										<Button
											className="small"
											onClick={onClickEditAuthMethods}
										>
											Edit Sign-In Methods
										</Button>
									</BoxRow>
								</BoxRowSection>
								<BoxRowSection heading="Display">
									<FieldBoxRow
										as="select"
										name="settings.theme"
										label="Theme"
									>
										<option value="standard">Standard</option>
										<option value="dark">Dark</option>
										<option value="felt">Felt</option>
										<option value="sbahj">SBaHJ</option>
										<option value="trickster">Trickster</option>
									</FieldBoxRow>
									<FieldBoxRow
										type="checkbox"
										name="settings.stickyNav"
										label="Sticky Nav Bar"
										help="Makes the nav bar stick to the top of your screen when you scroll down instead of scrolling out of the page."
									/>
									<FieldBoxRow
										type="checkbox"
										name="settings.imageAliasing"
										// This setting's label should not use terminology less obscure than "Aliasing", because if its phrasing is less obscure (for example if it were called "Crisp Images" or "Image Sharpening"), it would be easily misinterpretable and lead to misunderstandings about what the setting does, even among users who know what aliasing is, since it wouldn't be called that. With this more obscure but more accurate name, it is much less likely that inaccurate assumptions would be made about the meaning, and users would be more inclined to click the help button for clarity.
										label="Image Aliasing"
										help={'Disables anti-aliasing in images on adventure pages (by using nearest-neighbor scaling).\n\nWhat this means is images, when scaled, will tend to have more crisp edges rather than becoming blurry. It disables the browser\'s smooth scaling effect that causes scaled images to blur.'}
									/>
									<FieldBoxRow
										type="checkbox"
										name="settings.ads.side"
										label="Side Ad"
										onChange={values.settings.ads.side ? interceptAdDisable : handleChange}
									/>
									<FieldBoxRow
										type="checkbox"
										name="settings.ads.matchedContent"
										label="Matched Content Ad"
										onChange={values.settings.ads.matchedContent ? interceptAdDisable : handleChange}
									/>
								</BoxRowSection>
								<BoxRowSection heading="Utility">
									<FieldBoxRow
										type="checkbox"
										name="settings.autoOpenSpoilers"
										label="Auto-Open Spoilers"
										help="Makes spoilers open by default instead of closed."
									/>
									<FieldBoxRow
										type="checkbox"
										name="settings.preloadImages"
										label="Preload Images"
										help="Loads images on adjacent adventure pages so they may already be loaded when an adjacent page is opened."
									/>
								</BoxRowSection>
								<BoxColumns>
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
								</BoxColumns>
								<BoxRowSection heading="Controls">
									<BoxRow className="translucent-text">
										Select a box and press a key. Press escape to remove a control.
									</BoxRow>
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
								</BoxRowSection>
								<BoxSection heading="Advanced" collapsible>
									<Label htmlFor="field-style">
										Custom Site Style
									</Label>
									<Field
										as="textarea"
										id="field-style"
										name="settings.style"
										rows={5}
										placeholder={'Paste SCSS here.\nIf you don\'t know what this is, don\'t worry about it.'}
									/>
								</BoxSection>
								<BoxFooter>
									<BoxRow>
										<Button
											type="submit"
											className="alt"
											disabled={!dirty || isSubmitting}
										>
											Save
										</Button>
										<Button
											title="Reset settings to default"
											disabled={isEqual(values.settings, defaultSettingsValues)}
											onClick={
												useCallback(async () => {
													if (await Dialog.confirm({
														id: 'reset-settings',
														title: 'Reset Settings',
														content: 'Are you sure you want to reset your settings to default?\n\nAll changes will be lost.'
													})) {
														setFieldValue('settings', defaultSettingsValues);
														onFormChange();
													}
												}, [setFieldValue])
											}
										>
											Reset
										</Button>
									</BoxRow>
									<BoxRow>
										<Button
											disabled={isSubmitting}
											onClick={
												useCallback(async () => {
													setSubmitting(true);

													const { data: doesOwnStories } = await (api as DoesOwnStoriesAPI).get(`users/${privateUser.id}/doesOwnStories`).catch(error => {
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
												}, [setSubmitting])
											}
										>
											Delete Account
										</Button>
									</BoxRow>
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