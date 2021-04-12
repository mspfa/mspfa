import Page from 'components/Page';
import type { MyGetServerSideProps } from 'modules/server/pages';
import { setUser, useUser } from 'modules/client/users';
import type { PrivateUser } from 'modules/client/users';
import { Perm, permToGetUserInPage } from 'modules/server/perms';
import { getPrivateUser } from 'modules/server/users';
import { withErrorPage } from 'pages/_error';
import { Form, Formik, Field } from 'formik';
import { useCallback, useState } from 'react';
import { getChangedValues, useLeaveConfirmation } from 'modules/client/forms';
import Grid from 'components/Grid';
import SettingGroup from 'components/Setting/SettingGroup';
import Setting from 'components/Setting';
import NotificationSettingGroup from 'components/Setting/NotificationSettingGroup';
import NotificationSetting from 'components/Setting/NotificationSetting';
import ControlSetting from 'components/Setting/ControlSetting';
import GridFooter from 'components/Grid/GridFooter';
import Button from 'components/Button';
import api from 'modules/client/api';
import type { APIClient } from 'modules/client/api';
import { setTheme } from 'modules/client/themes';
import './styles.module.scss';

type UserAPI = APIClient<typeof import('pages/api/users/[userID]').default>;

const getSettingsValuesFromUser = ({ settings }: PrivateUser) => ({
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

type Values = ReturnType<typeof getSettingsValuesFromUser>;

type ServerSideProps = {
	user: PrivateUser
} | {
	statusCode: number
};

const Component = withErrorPage<ServerSideProps>(({ user: initialUser }) => {
	const [requestedUser, setRequestedUser] = useState(initialUser);
	const user = useUser()!;

	const initialValues = getSettingsValuesFromUser(requestedUser);

	const onSubmit = useCallback((values: Values) => {
		const changedValues = getChangedValues(initialValues, values);

		(api as UserAPI).put(`users/${requestedUser.id}`, {
			settings: changedValues
		}).then(({ data }) => {
			setRequestedUser(data);

			if (user.id === data.id) {
				setUser(data);
			}
		});

		// This ESLint comment is necessary because the rule incorrectly thinks `initialValues` should be a dependency here, despite that `initialValues` depends on `requestedUser` which is already a dependency.
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [requestedUser, user]);

	return (
		<Page heading="Settings">
			<Formik
				initialValues={initialValues}
				onSubmit={onSubmit}
				enableReinitialize
			>
				{({ handleChange, dirty }) => {
					useLeaveConfirmation(dirty);

					return (
						<Form>
							<Grid>
								<SettingGroup heading="Display">
									<Setting
										as="select"
										name="theme"
										label="Theme"
										onChange={useCallback(evt => {
											handleChange(evt);

											// Preview the changed theme.
											setTheme(evt.target.value);
										}, [handleChange])}
									>
										<option value="standard">Standard</option>
										<option value="dark">Dark</option>
										<option value="felt">Felt</option>
										<option value="sbahj">SBaHJ</option>
										<option value="trickster">Trickster</option>
									</Setting>
									<Setting
										name="stickyNav"
										label="Sticky nav bar"
										info="Makes the nav bar stick to the top of your screen when you scroll down instead of scrolling out of the page."
									/>
									<Setting
										name="imageSharpening"
										label="Image sharpening"
										info="Sharpens images in adventure pages which are scaled to a different size from their original (using nearest-neighbor scaling instead of antialiasing)."
									/>
									<Setting
										name="ads.side"
										label="Side ad"
									/>
									<Setting
										name="ads.matchedContent"
										label="Matched content ad"
									/>
								</SettingGroup>
								<SettingGroup heading="Utility">
									<Setting
										name="autoOpenSpoilers"
										label="Auto-open spoilers"
										info="Makes spoilers open by default instead of closed."
									/>
									<Setting
										name="preloadImages"
										label="Preload images"
										info="Loads images on adjacent adventure pages so they may already be loaded when an adjacent page is opened."
									/>
								</SettingGroup>
								<Grid id="notification-settings">
									<NotificationSettingGroup heading="General Notifications">
										<NotificationSetting
											name="notifications.messages"
											label="Messages"
											info="Get notified when a user sends you a new private message."
										/>
										<NotificationSetting
											name="notifications.userTags"
											label="User tags"
											info="Get notified when you are tagged in a comment."
										/>
										<NotificationSetting
											name="notifications.commentReplies"
											label="Replies to comments"
											info="Get notified when one of your comments receives a reply."
										/>
									</NotificationSettingGroup>
									<NotificationSettingGroup heading="Default Adventure Notifications">
										<NotificationSetting
											name="notifications.comicDefaults.updates"
											label="Updates"
											info="Get notified when an adventure publishes new pages."
										/>
										<NotificationSetting
											name="notifications.comicDefaults.news"
											label="News"
											info="Get notified when an adventure publishes a new news post."
										/>
										<NotificationSetting
											name="notifications.comicDefaults.comments"
											label="Comments"
											info="Get notified when an adventure you edit receives a new comment."
										/>
									</NotificationSettingGroup>
								</Grid>
								<SettingGroup
									heading="Controls"
									info="Select a box and press a key. Press escape to remove a control."
								>
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
								</SettingGroup>
								<SettingGroup heading="Advanced" special>
									<label className="setting-label" htmlFor="setting-style">Custom Site Style</label><br />
									<Field
										as="textarea"
										id="setting-style"
										name="style"
										rows={5}
										placeholder={"Paste SCSS here.\nIf you don't know what this is, don't worry about it."}
									/>
								</SettingGroup>
								<GridFooter>
									<Button className="alt" type="submit" disabled={!dirty}>Save</Button>
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

export const getServerSideProps: MyGetServerSideProps<ServerSideProps> = async ({ req, params }) => {
	const { user, statusCode } = await permToGetUserInPage(req, params.userID, Perm.sudoRead);

	if (statusCode) {
		return { props: { statusCode } };
	}

	return {
		props: {
			user: getPrivateUser(user!)
		}
	};
};