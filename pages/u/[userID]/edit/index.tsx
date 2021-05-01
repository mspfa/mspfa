import '../styles.module.scss';
import Page from 'components/Page';
import { setUser, setUserMerge, useUser } from 'modules/client/users';
import type { PrivateUser } from 'modules/client/users';
import { Perm } from 'modules/client/perms';
import { permToGetUserInPage } from 'modules/server/perms';
import { getPrivateUser } from 'modules/server/users';
import { withErrorPage } from 'modules/client/errors';
import { withStatusCode } from 'modules/server/errors';
import { Form, Formik } from 'formik';
import { useCallback, useEffect, useState } from 'react';
import { getChangedValues, useLeaveConfirmation } from 'modules/client/forms';
import Grid from 'components/Grid';
import ColumnGrid from 'components/Grid/ColumnGrid';
import GridSection from 'components/Grid/GridSection';
import GridRowSection from 'components/Grid/GridRowSection';
import FieldGridRow from 'components/Grid/FieldGridRow';
import GridFooter from 'components/Grid/GridFooter';
import Button from 'components/Button';
import api from 'modules/client/api';
import type { APIClient } from 'modules/client/api';
import LabeledGridRow from 'components/Grid/LabeledGridRow';
import GridRow from 'components/Grid/GridRow';
import Link from 'components/Link';
import IconImage from 'components/IconImage';

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
	const user = useUser()!;

	const initialValues = getValuesFromUser(privateUser);

	useEffect(() => () => {
		// The page unmounted, so reset the previewed unsaved settings.
		setUserMerge(undefined);
	}, []);

	return (
		<Page flashyTitle heading="Edit Profile">
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

						// This ESLint comment is necessary because the rule incorrectly thinks `initialValues` should be a dependency here, despite that it depends on `privateUser` which is already a dependency.
						// eslint-disable-next-line react-hooks/exhaustive-deps
					}, [privateUser, user])
				}
				enableReinitialize
			>
				{({ isSubmitting, dirty, values }) => {
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
							<Grid id="profile-grid">
								<ColumnGrid>
									<Grid id="profile-meta-grid">
										<GridSection id="profile-meta" heading="Meta">
											<div id="profile-name">
												{privateUser.name}
											</div>
											<IconImage id="profile-icon" src={privateUser.icon} />
										</GridSection>
									</Grid>
									<Grid>
										<GridRowSection heading="Stats">
											{privateUser.birthdate && (
												<LabeledGridRow label="Birthdate">
													{privateUser.birthdate}
												</LabeledGridRow>
											)}
										</GridRowSection>
										{(privateUser.email || privateUser.site) && (
											<GridRowSection heading="Contact">
												{privateUser.email && (
													<LabeledGridRow label="Email">
														<Link
															href={`mailto:${privateUser.email}`}
															target="_blank"
														>
															{privateUser.email}
														</Link>
													</LabeledGridRow>
												)}
												{privateUser.site && (
													<LabeledGridRow label="Website">
														<Link
															href={privateUser.site}
															target="_blank"
														>
															{privateUser.site}
														</Link>
													</LabeledGridRow>
												)}
											</GridRowSection>
										)}
									</Grid>
								</ColumnGrid>
								{privateUser.description && (
									<GridSection id="profile-description" heading="Description">
										{privateUser.description}
									</GridSection>
								)}
								<GridFooter>
									<GridRow>
										<Button
											className="alt"
											type="submit"
											disabled={isSubmitting || !dirty}
										>
											Save
										</Button>
									</GridRow>
									<Link
										className="button"
										href={`/u/${privateUser.id}`}
									>
										Back to Profile
									</Link>
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
			initialPrivateUser: getPrivateUser(user!)
		}
	};
});