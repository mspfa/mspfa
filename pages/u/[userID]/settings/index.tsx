import Page from 'components/Page';
import { setUser, setUserMerge, useUser } from 'modules/client/users';
import type { PrivateUser } from 'modules/client/users';
import { Perm, permToGetUserInPage } from 'modules/server/perms';
import { defaultUser, getPrivateUser } from 'modules/server/users';
import { withErrorPage } from 'modules/client/errors';
import { withStatusCode } from 'modules/server/errors';
import { Form, Formik, Field } from 'formik';
import { useCallback, useEffect, useState } from 'react';
import { getChangedValues, useLeaveConfirmation } from 'modules/client/forms';
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
import './styles.module.scss';
import Label from 'components/Label';

type UserAPI = APIClient<typeof import('pages/api/users/[userID]').default>;

const getSettingsValues = (settings: PrivateUser['settings']) => ({
	ads: settings.ads,
	autoOpenSpoilers: settings.autoOpenSpoilers,
	preloadImages: settings.preloadImages,
	stickyNav: settings.stickyNav,
	imageSharpening: settings.imageSharpening,
	theme: settings.theme,
	style: settings.style,
	controls: settings.controls,
	notifications: {
		messages: settings.notifications.messages,
		userTags: settings.notifications.userTags,
		commentReplies: settings.notifications.commentReplies,
		comicDefaults: settings.notifications.comicDefaults
	}
});

type Values = ReturnType<typeof getSettingsValues>;

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
		defaultValues = getSettingsValues(defaultSettings);
	}

	const initialValues = getSettingsValues(privateUser.settings);

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
						const { data } = await (api as UserAPI).put(`users/${privateUser.id}`, {
							settings: getChangedValues(initialValues, values)
						});

						setPrivateUser(data);

						if (user.id === data.id) {
							setUser(data);
						}

						// This ESLint comment is necessary because the rule incorrectly thinks `initialValues` should be a dependency here, despite that `initialValues` depends on `privateUser` which is already a dependency.
						// eslint-disable-next-line react-hooks/exhaustive-deps
					}, [privateUser, user])
				}
				enableReinitialize
			>
				{({ isSubmitting, dirty, setValues, values }) => {
					useLeaveConfirmation(dirty);

					useEffect(() => {
						if (formChanged) {
							formChanged = false;

							// Preview the unsaved settings by merging them with the user state.
							setUserMerge({ settings: values });
						}
					});

					return (
						<Form onChange={onFormChange}>
							<Grid>
								<GridRowSection heading="Display">
									<FieldGridRow
										as="select"
										name="theme"
										label="Theme"
									>
										<option value="standard">Standard</option>
										<option value="dark">Dark</option>
										<option value="felt">Felt</option>
										<option value="sbahj">SBaHJ</option>
										<option value="trickster">Trickster</option>
									</FieldGridRow>
									<FieldGridRow
										name="stickyNav"
										label="Sticky Nav Bar"
										help="Makes the nav bar stick to the top of your screen when you scroll down instead of scrolling out of the page."
									/>
									<FieldGridRow
										name="imageSharpening"
										label="Image Sharpening"
										help={'Disables anti-aliasing in images from adventure pages (using nearest-neighbor scaling).\n\nWhat this means is images, when scaled, will tend to have more crisp edges rather than becoming blurry.'}
									/>
									<FieldGridRow
										name="ads.side"
										label="Side Ad"
									/>
									<FieldGridRow
										name="ads.matchedContent"
										label="Matched Content Ad"
									/>
								</GridRowSection>
								<GridRowSection heading="Utility">
									<FieldGridRow
										name="autoOpenSpoilers"
										label="Auto-Open Spoilers"
										help="Makes spoilers open by default instead of closed."
									/>
									<FieldGridRow
										name="preloadImages"
										label="Preload Images"
										help="Loads images on adjacent adventure pages so they may already be loaded when an adjacent page is opened."
									/>
								</GridRowSection>
								<ColumnGrid>
									<NotificationSettingGroup heading="General Notifications">
										<NotificationSetting
											name="notifications.messages"
											label="Messages"
											help="Get notified when a user sends you a new private message."
										/>
										<NotificationSetting
											name="notifications.userTags"
											label="User Tags"
											help="Get notified when you are tagged in a comment."
										/>
										<NotificationSetting
											name="notifications.commentReplies"
											label="Replies to Comments"
											help="Get notified when one of your comments receives a reply."
										/>
									</NotificationSettingGroup>
									<NotificationSettingGroup heading="Default Adventure Notifications">
										<NotificationSetting
											name="notifications.comicDefaults.updates"
											label="Updates"
											help="Get notified when an adventure publishes new pages."
										/>
										<NotificationSetting
											name="notifications.comicDefaults.news"
											label="News"
											help="Get notified when an adventure publishes a news post."
										/>
										<NotificationSetting
											name="notifications.comicDefaults.comments"
											label="Comments"
											help="Get notified when an adventure you edit receives a new comment."
										/>
									</NotificationSettingGroup>
								</ColumnGrid>
								<GridRowSection heading="Controls">
									<div className="info translucent-text">
										Select a box and press a key. Press escape to remove a control.
									</div>
									<ControlSetting
										name="controls.back"
										label="Back"
									/>
									<ControlSetting
										name="controls.forward"
										label="Forward"
									/>
									<ControlSetting
										name="controls.toggleSpoilers"
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
										name="style"
										rows={5}
										placeholder={"Paste SCSS here.\nIf you don't know what this is, don't worry about it."}
									/>
								</GridSection>
								<GridFooter>
									<Button
										className="alt"
										type="submit"
										disabled={isSubmitting || !dirty}
									>
										Save
									</Button>
									<Button
										title="Reset settings to default"
										disabled={_.isEqual(values, defaultValues!)}
										onClick={
											useCallback(() => {
												new Dialog({
													id: 'reset',
													title: 'Reset',
													content: 'Are you sure you want to reset your settings to default?\n\nAny unsaved changes will be lost.',
													actions: ['Yes', 'No']
												}).then(result => {
													if (result?.submit) {
														setValues(defaultValues!);
													}
												});
											}, [setValues])
										}
									>
										Reset
									</Button>
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