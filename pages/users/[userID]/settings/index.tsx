import Page from 'components/Page';
import { useUser } from 'lib/client/reactContexts/UserContext';
import type { PrivateUser } from 'lib/client/users';
import Perm from 'lib/client/Perm';
import { permToGetUserInPage } from 'lib/server/users/permToGetUser';
import { getPrivateUser } from 'lib/server/users';
import { withErrorPage } from 'lib/client/errors';
import withStatusCode from 'lib/server/withStatusCode';
import { Form, Formik, Field } from 'formik';
import { useEffect, useRef, useState } from 'react';
import useFunction from 'lib/client/reactHooks/useFunction';
import { getChangedValues, useLeaveConfirmation } from 'lib/client/forms';
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
import { isEqual, mergeWith } from 'lodash';
import Dialog from 'components/Dialog';
import Label from 'components/Label';
import Row from 'components/Row';
import AuthMethods from 'components/AuthMethod/AuthMethods';
import BirthdateGridRow from 'components/LabeledGrid/LabeledGridRow/BirthdateGridRow';
import type { integer } from 'lib/types';
import useSubmitOnSave from 'lib/client/reactHooks/useSubmitOnSave';
import defaultUserSettings from 'lib/client/defaultUserSettings';
import useLatest from 'lib/client/reactHooks/useLatest';
import DeleteUserButton from 'components/Button/DeleteUserButton';
import ChangePasswordButton from 'components/Button/ChangePasswordButton';
import overwriteArrays from 'lib/client/overwriteArrays';
import Action from 'components/Dialog/Action';
import useEmailTaken from 'lib/client/reactHooks/useEmailTaken';
import TopActions from 'components/TopActions';

type UserAPI = APIClient<typeof import('pages/api/users/[userID]').default>;
type UserAuthMethodsAPI = APIClient<typeof import('pages/api/users/[userID]/auth-methods').default>;

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
	email: (privateUser.email || privateUser.unverifiedEmail)!,
	birthdate: privateUser.birthdate,
	settings: getSettingsValues(privateUser.settings)
});

type Values = ReturnType<typeof getValuesFromUser>;

let defaultUserSettingsValues: ReturnType<typeof getSettingsValues> | undefined;

type ServerSideProps = {
	initialPrivateUser: PrivateUser
} | {
	statusCode: integer
};

const Component = withErrorPage<ServerSideProps>(({ initialPrivateUser }) => {
	const [user, setUser] = useUser<true>();
	const userRef = useLatest(user);

	const [privateUser, setPrivateUser] = useState(initialPrivateUser);

	if (!defaultUserSettingsValues) {
		defaultUserSettingsValues = getSettingsValues(defaultUserSettings);
	}

	const initialValues = getValuesFromUser(privateUser);

	// Undo the previewed settings on unmount.
	const restoreUser = useFunction(() => {
		if (user.id === privateUser.id) {
			setUser(privateUser);
		}
	});
	useEffect(() => restoreUser, [restoreUser]);

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

						if (userRef.current.id === privateUser.id) {
							setUser(data);
						}
					})
				}
				enableReinitialize
			>
				{({ isSubmitting, dirty, values, setFieldValue, submitForm, initialValues }) => {
					useLeaveConfirmation(dirty);

					const formChangedRef = useRef(false);
					useEffect(() => {
						if (formChangedRef.current) {
							formChangedRef.current = false;

							if (user.id === privateUser.id) {
								const userWithPreviewedSettings = mergeWith(
									{},
									user,
									{ settings: values.settings },
									overwriteArrays
								);

								setUser(userWithPreviewedSettings);
							}
						}
					});

					const changedEmail = initialValues.email !== values.email;
					const { emailInputRef, emailTakenGridRow } = useEmailTaken(
						changedEmail && values.email
					);

					return (
						<Form
							onChange={
								useFunction(() => {
									formChangedRef.current = true;
								})
							}
							ref={useSubmitOnSave({ submitForm, dirty, isSubmitting })}
						>
							<TopActions>
								<Button
									type="submit"
									className="alt"
									disabled={!dirty || isSubmitting}
								>
									Save
								</Button>
							</TopActions>
							<LabeledGridSection heading="Account">
								<LabeledGridField
									type="email"
									name="email"
									label="Email"
									autoComplete="email"
									required
									maxLength={254}
									innerRef={emailInputRef as any}
								/>
								{emailTakenGridRow}
								<BirthdateGridRow
									birthdateChanged={privateUser.birthdateChanged}
								/>
								<Row>
									{/* This button should remain visible even for those who do not have a password sign-in method, because those users may think they do regardless, and they should be informed that they don't upon clicking this button, to minimize confusion to those users. */}
									<ChangePasswordButton privateUser={privateUser} />
								</Row>
								<Row>
									<Button
										className="small"
										onClick={
											useFunction(async () => {
												const { data: authMethods } = await (api as UserAuthMethodsAPI).get(`/users/${privateUser.id}/auth-methods`);

												Dialog.create(
													<Dialog id="auth-methods" title="Edit Sign-In Methods">
														<AuthMethods userID={privateUser.id} authMethods={authMethods} />

														<Action>Done</Action>
													</Dialog>
												);
											})
										}
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
									help="Makes the nav bar stick to the top of your screen when you scroll down so you can always access it easily."
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
								<Button
									title="Reset Settings to Default"
									disabled={isEqual(values.settings, defaultUserSettingsValues)}
									onClick={
										useFunction(async () => {
											if (!await Dialog.confirm(
												<Dialog id="reset-settings" title="Reset Settings">
													Are you sure you want to reset your settings to default?<br />
													<br />
													All unsaved changes will be lost, but this won't overwrite your previous settings until you save.
												</Dialog>
											)) {
												return;
											}

											setFieldValue('settings', defaultUserSettingsValues);

											formChangedRef.current = true;
										})
									}
								>
									Reset to Default
								</Button>
								<DeleteUserButton privateUser={privateUser} />
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
	const { user, statusCode } = await permToGetUserInPage(req, params.userID, Perm.READ);

	if (statusCode) {
		return { props: { statusCode } };
	}

	return {
		props: {
			initialPrivateUser: getPrivateUser(user!)
		}
	};
});
