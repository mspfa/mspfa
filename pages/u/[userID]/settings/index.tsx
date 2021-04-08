import Page from 'components/Page';
import type { MyGetServerSideProps } from 'modules/server/pages';
import type { PrivateUser } from 'modules/client/users';
import { getUserByUnsafeID, getPrivateUser } from 'modules/server/users';
import ErrorPage from 'pages/_error';
import { Field, Form, Formik } from 'formik';
import type { FormikHelpers } from 'formik';
import GridSection from 'components/GridSection';
import GridSectionHeading from 'components/GridSection/GridSectionHeading';
import GridSubsection from 'components/GridSection/GridSubsection';
import { themeNames } from 'modules/client/themes';
import type { Theme } from 'modules/client/themes';
import './styles.module.scss';

const getSettingsValuesFromUser = ({ settings }: PrivateUser) => ({
	ads: settings.ads,
	autoOpenSpoilers: settings.autoOpenSpoilers, // TODO
	preloadImages: settings.preloadImages, // TODO
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
					<GridSection>
						<GridSectionHeading>Display</GridSectionHeading>
						<GridSubsection id="settings-theme" className="setting">
							<label htmlFor="setting-theme" className="setting-label">
								Theme:
							</label>
							<div className="setting-input">
								<Field
									as="select"
									id="setting-theme"
									name="theme"
								>
									{(Object.keys(themeNames) as Theme[]).map(theme => (
										<option key={theme} value={theme}>
											{themeNames[theme]}
										</option>
									))}
								</Field>
							</div>

							<label htmlFor="setting-sticky-nav" className="setting-label">
								Sticky nav bar:
							</label>
							<div className="setting-input">
								<Field
									id="setting-sticky-nav"
									name="stickyNav"
									type="checkbox"
								/>
							</div>

							<label htmlFor="setting-pixelated-images" className="setting-label">
								Pixelated images:
							</label>
							<div className="setting-input">
								<Field
									id="setting-pixelated-images"
									name="pixelatedImages"
									type="checkbox"
								/>
							</div>

							<label htmlFor="setting-ads-side" className="setting-label">
								Side ad:
							</label>
							<div className="setting-input">
								<Field
									id="setting-ads-side"
									name="ads.side"
									type="checkbox"
								/>
							</div>

							<label htmlFor="setting-ads-matched-content" className="setting-label">
								Matched content ad:
							</label>
							<div className="setting-input">
								<Field
									id="setting-ads-matched-content"
									name="ads.matchedContent"
									type="checkbox"
								/>
							</div>
						</GridSubsection>
						<GridSectionHeading>Something Else</GridSectionHeading>
						<GridSubsection id="settings-ads" className="setting">
							<label htmlFor="" className="setting-label">Label:</label>
							<div className="setting-input" />
						</GridSubsection>
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