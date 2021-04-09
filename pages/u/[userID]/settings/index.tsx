import Page from 'components/Page';
import type { MyGetServerSideProps } from 'modules/server/pages';
import type { PrivateUser } from 'modules/client/users';
import { getUserByUnsafeID, getPrivateUser } from 'modules/server/users';
import ErrorPage from 'pages/_error';
import { Form, Formik } from 'formik';
import type { FormikHelpers } from 'formik';
import Grid from 'components/Grid';
import SettingGroup from 'components/Setting/SettingGroup';
import Setting from 'components/Setting';
import NotificationSettingGroup from 'components/Setting/NotificationSettingGroup';
import NotificationSetting from 'components/Setting/NotificationSetting';
import { Theme } from 'modules/client/themes';
import './styles.module.scss';

const getSettingsValuesFromUser = ({ settings }: PrivateUser) => ({
	ads: settings.ads,
	autoOpenSpoilers: settings.autoOpenSpoilers,
	preloadImages: settings.preloadImages,
	stickyNav: settings.stickyNav,
	imageSharpening: settings.imageSharpening,
	theme: settings.theme,
	style: settings.style, // TODO
	keybinds: settings.keybinds, // TODO
	notifications: {
		messages: settings.notifications.messages, // TODO
		userTags: settings.notifications.userTags, // TODO
		commentReplies: settings.notifications.commentReplies, // TODO
		comicDefaults: settings.notifications.comicDefaults // TODO
	}
});

type Values = ReturnType<typeof getSettingsValuesFromUser>;

const submitSettings = (values: Values, formikHelpers: FormikHelpers<Values>) => {

};

type ServerSideProps = {
	user?: PrivateUser,
	statusCode?: number
};

const Component = ({ user, statusCode }: ServerSideProps) => (
	user ? (
		<Page heading="Settings">
			<Formik
				initialValues={getSettingsValuesFromUser(user)}
				onSubmit={submitSettings}
			>
				<Form>
					<Grid>
						<SettingGroup heading="Display">
							<Setting
								as="select"
								name="theme"
								label="Theme"
							>
								<option value={Theme.Standard}>Standard</option>
								<option value={Theme.Dark}>Dark</option>
								<option value={Theme.Felt}>Felt</option>
								<option value={Theme.SBaHJ}>SBaHJ</option>
								<option value={Theme.Trickster}>Trickster</option>
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
									siteFieldProps={{
										disabled: true
									}}
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
					</Grid>
				</Form>
			</Formik>
		</Page>
	) : <ErrorPage statusCode={statusCode} />
);

export default Component;

export const getServerSideProps: MyGetServerSideProps = async context => {
	const props: ServerSideProps = {};

	if (context.req.user) {
		const userFromParams = await getUserByUnsafeID(context.params.userID);
		if (userFromParams) {
			// Check if `context.req.user` has permission to access `userFromParams`.
			if (
				userFromParams._id.equals(context.req.user._id)
				|| context.req.user.perms.unrestrictedAccess
			) {
				props.user = getPrivateUser(userFromParams);
			} else {
				props.statusCode = 403;
			}
		} else {
			props.statusCode = 404;
		}
	} else {
		props.statusCode = 403;
	}

	return { props };
};