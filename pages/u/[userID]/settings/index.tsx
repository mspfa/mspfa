import Page from 'components/Page';
import type { MyGetServerSideProps } from 'modules/server/pages';
import type { PrivateUser } from 'modules/client/users';
import { getUserByUnsafeID, getPrivateUser } from 'modules/server/users';
import { withErrorPage } from 'pages/_error';
import { Form, Formik, Field } from 'formik';
import { useCallback } from 'react';
import { getChangedValues } from 'modules/client/forms';
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

const Component = withErrorPage<ServerSideProps>(({ user }) => {
	const initialValues = getSettingsValuesFromUser(user);

	const onSubmit = useCallback((values: Values) => {
		const changedValues = getChangedValues(initialValues, values);

		if (changedValues) {
			(api as UserAPI).put(`users/${user.id}`, {
				settings: changedValues
			});
		}

		// This ESLint comment is necessary because the rule incorrectly thinks `initialValues` should be a dependency here, despite that `initialValues` depends on `user` which is already a dependency.
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [user]);

	return (
		<Page heading="Settings">
			<Formik
				initialValues={initialValues}
				onSubmit={onSubmit}
			>
				<Form>
					<Grid>
						<SettingGroup heading="Display">
							<Setting
								as="select"
								name="theme"
								label="Theme"
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
							/>
							<Setting
								name="imageSharpening"
								label="Image sharpening"
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
							/>
							<Setting
								name="preloadImages"
								label="Preload images"
							/>
						</SettingGroup>
						<Grid id="notification-settings">
							<NotificationSettingGroup heading="General Notifications">
								<NotificationSetting
									name="notifications.messages"
									label="Messages"
								/>
								<NotificationSetting
									name="notifications.userTags"
									label="User tags"
								/>
								<NotificationSetting
									name="notifications.commentReplies"
									label="Replies to comments"
								/>
							</NotificationSettingGroup>
							<NotificationSettingGroup heading="Default Adventure Notifications">
								<NotificationSetting
									name="notifications.comicDefaults.updates"
									label="Updates"
								/>
								<NotificationSetting
									name="notifications.comicDefaults.news"
									label="News"
								/>
								<NotificationSetting
									name="notifications.comicDefaults.comments"
									label="Comments"
								/>
							</NotificationSettingGroup>
						</Grid>
						<SettingGroup
							heading="Controls"
							tip="Select a box and press a key. Press escape to remove a shortcut."
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
							<Button className="alt" type="submit">Save</Button>
						</GridFooter>
					</Grid>
				</Form>
			</Formik>
		</Page>
	);
});

export default Component;

export const getServerSideProps: MyGetServerSideProps<ServerSideProps> = async ({ req, params }) => {
	if (req.user) {
		const userFromParams = await getUserByUnsafeID(params.userID);
		if (userFromParams) {
			// Check if `req.user` has permission to access `userFromParams`.
			if (
				userFromParams._id.equals(req.user._id)
				|| req.user.perms.sudoRead
			) {
				return {
					props: {
						user: getPrivateUser(userFromParams)
					}
				};
			}

			return { props: { statusCode: 403 } };
		}

		return { props: { statusCode: 404 } };
	}

	return { props: { statusCode: 403 } };
};