import Page from 'components/Page';
import type { MyGetServerSideProps } from 'modules/server/pages';
import type { PrivateUser } from 'modules/client/users';
import { getUserByUnsafeID, getPrivateUser } from 'modules/server/users';
import ErrorPage from 'pages/_error';
import { Form, Formik, Field } from 'formik';
import type { FormikHelpers } from 'formik';
import GridSection from 'components/GridSection';
import SettingGroup from 'components/Setting/SettingGroup';
import Setting from 'components/Setting';
import { themeNames } from 'modules/client/themes';
import type { Theme } from 'modules/client/themes';
import './styles.module.scss';

const getSettingsValuesFromUser = ({ settings }: PrivateUser) => ({
	ads: settings.ads,
	autoOpenSpoilers: settings.autoOpenSpoilers,
	preloadImages: settings.preloadImages,
	stickyNav: settings.stickyNav,
	pixelatedImages: settings.pixelatedImages,
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
		<Page heading="Settings" margin>
			<Formik
				initialValues={getSettingsValuesFromUser(user)}
				onSubmit={submitSettings}
			>
				<Form>
					<GridSection id="settings">
						<SettingGroup heading="Display" normal>
							<Setting label="Theme" as="select" name="theme">
								{(Object.keys(themeNames) as Theme[]).map(theme => (
									<option key={theme} value={theme}>
										{themeNames[theme]}
									</option>
								))}
							</Setting>
							<Setting label="Sticky nav bar" name="stickyNav" />
							<Setting label="Pixelated images" name="pixelatedImages" />
							<Setting label="Side ad" name="ads.side" />
							<Setting label="Matched content ad" name="ads.matchedContent" />
						</SettingGroup>
						<SettingGroup heading="Utility" normal>
							<Setting label="Auto-open spoilers" name="autoOpenSpoilers" />
							<Setting label="Preload images" name="preloadImages" />
						</SettingGroup>
						<SettingGroup id="settings-group-notifications" heading="General Notifications">
							<div id="settings-notifications">
								<div id="settings-notifications-heading-email" className="settings-notifications-heading">
									Email
								</div>
								<div id="settings-notifications-heading-site" className="settings-notifications-heading">
									Site
								</div>
								<label className="setting-label">Messages</label>
								<div className="setting-input">
									<Field
										id="setting-notifications-"
										name="notifications."
										type="checkbox"
									/>
								</div>
								<div className="setting-input">
									<Field
										id="setting-notifications-"
										name="notifications."
										type="checkbox"
									/>
								</div>
								<label className="setting-label">User tags</label>
								<div className="setting-input">
									<Field
										id="setting-notifications-"
										name="notifications."
										type="checkbox"
									/>
								</div>
								<div className="setting-input">
									<Field
										id="setting-notifications-"
										name="notifications."
										type="checkbox"
									/>
								</div>
								<label className="setting-label">Comment replies</label>
								<div className="setting-input">
									<Field
										id="setting-notifications-"
										name="notifications."
										type="checkbox"
									/>
								</div>
								<div className="setting-input">
									<Field
										id="setting-notifications-"
										name="notifications."
										type="checkbox"
									/>
								</div>
							</div>
						</SettingGroup>
						<SettingGroup id="settings-group-notifications" heading="Default Adventure Notifications">
							<div id="settings-notifications">
								<div id="settings-notifications-heading-email" className="settings-notifications-heading">
									Email
								</div>
								<div id="settings-notifications-heading-site" className="settings-notifications-heading">
									Site
								</div>
								<label className="setting-label">Updates</label>
								<div className="setting-input">
									<Field
										id="setting-notifications-"
										name="notifications."
										type="checkbox"
									/>
								</div>
								<div className="setting-input">
									<Field
										id="setting-notifications-"
										name="notifications."
										type="checkbox"
									/>
								</div>
								<label className="setting-label">News</label>
								<div className="setting-input">
									<Field
										id="setting-notifications-"
										name="notifications."
										type="checkbox"
									/>
								</div>
								<div className="setting-input">
									<Field
										id="setting-notifications-"
										name="notifications."
										type="checkbox"
									/>
								</div>
								<label className="setting-label">Comments</label>
								<div className="setting-input">
									<Field
										id="setting-notifications-"
										name="notifications."
										type="checkbox"
									/>
								</div>
								<div className="setting-input">
									<Field
										id="setting-notifications-"
										name="notifications."
										type="checkbox"
									/>
								</div>
							</div>
						</SettingGroup>
					</GridSection>
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