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
import Box from 'components/Box';
import BoxColumns from 'components/Box/BoxColumns';
import BoxSection from 'components/Box/BoxSection';
import BoxRowSection from 'components/Box/BoxRowSection';
import FieldBoxRow from 'components/Box/FieldBoxRow';
import BoxFooter from 'components/Box/BoxFooter';
import Button from 'components/Button';
import api from 'modules/client/api';
import type { APIClient } from 'modules/client/api';
import LabeledBoxRow from 'components/Box/LabeledBoxRow';
import BoxRow from 'components/Box/BoxRow';
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
							<Box id="profile-box">
								<BoxColumns>
									<Box id="profile-meta-box">
										<BoxSection id="profile-meta" heading="Meta">
											<div id="profile-name">
												{privateUser.name}
											</div>
											<IconImage id="profile-icon" src={privateUser.icon} />
										</BoxSection>
									</Box>
									<Box>
										<BoxRowSection heading="Stats">
											{privateUser.birthdate && (
												<LabeledBoxRow label="Birthdate">
													{privateUser.birthdate}
												</LabeledBoxRow>
											)}
										</BoxRowSection>
										{(privateUser.email || privateUser.site) && (
											<BoxRowSection heading="Contact">
												{privateUser.email && (
													<LabeledBoxRow label="Email">
														<Link
															href={`mailto:${privateUser.email}`}
															target="_blank"
														>
															{privateUser.email}
														</Link>
													</LabeledBoxRow>
												)}
												{privateUser.site && (
													<LabeledBoxRow label="Website">
														<Link
															href={privateUser.site}
															target="_blank"
														>
															{privateUser.site}
														</Link>
													</LabeledBoxRow>
												)}
											</BoxRowSection>
										)}
									</Box>
								</BoxColumns>
								{privateUser.description && (
									<BoxSection id="profile-description" heading="Description">
										{privateUser.description}
									</BoxSection>
								)}
								<BoxFooter>
									<BoxRow>
										<Button
											className="alt"
											type="submit"
											disabled={isSubmitting || !dirty}
										>
											Save
										</Button>
									</BoxRow>
									<Link
										className="button"
										href={`/u/${privateUser.id}`}
									>
										Back to Profile
									</Link>
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