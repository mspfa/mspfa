import './styles.module.scss';
import Page from 'components/Page';
import { getUser, setUser } from 'modules/client/users';
import type { PrivateUser } from 'modules/client/users';
import { Perm } from 'modules/client/perms';
import { permToGetUserInPage } from 'modules/server/perms';
import { getPrivateUser } from 'modules/server/users';
import { withErrorPage } from 'modules/client/errors';
import { withStatusCode } from 'modules/server/errors';
import { Field, Form, Formik } from 'formik';
import { useCallback, useState } from 'react';
import { getChangedValues, useLeaveConfirmation } from 'modules/client/forms';
import Box from 'components/Box';
import BoxColumns from 'components/Box/BoxColumns';
import BoxSection from 'components/Box/BoxSection';
import BoxRowSection from 'components/Box/BoxRowSection';
import BoxFooter from 'components/Box/BoxFooter';
import Button from 'components/Button';
import api from 'modules/client/api';
import type { APIClient } from 'modules/client/api';
import FieldBoxRow from 'components/Box/FieldBoxRow';
import IconImage from 'components/IconImage';
import Label from 'components/Label';
import LabeledBoxRow from 'components/Box/LabeledBoxRow';
import BoxRow from 'components/Box/BoxRow';
import BirthdateField from 'components/DateField/BirthdateField';
import BBField from 'components/BBCode/BBField';

type UserAPI = APIClient<typeof import('pages/api/users/[userID]').default>;

const getValuesFromUser = (privateUser: PrivateUser) => ({
	email: privateUser.email,
	name: privateUser.name,
	birthdate: privateUser.birthdate,
	description: privateUser.description,
	icon: privateUser.icon,
	site: privateUser.site,
	profileStyle: privateUser.profileStyle,
	settings: {
		emailPublic: privateUser.settings.emailPublic,
		birthdatePublic: privateUser.settings.birthdatePublic,
		favsPublic: privateUser.settings.favsPublic
	}
});

type Values = ReturnType<typeof getValuesFromUser>;

type ServerSideProps = {
	privateUser: PrivateUser
} | {
	statusCode: number
};

const Component = withErrorPage<ServerSideProps>(({ privateUser: initialPrivateUser }) => {
	const [privateUser, setPrivateUser] = useState(initialPrivateUser);

	const initialValues = getValuesFromUser(privateUser);

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
						if (getUser()!.id === privateUser.id) {
							setUser(data);
						}

						// This ESLint comment is necessary because the rule incorrectly thinks `initialValues` should be a dependency here, despite that it depends on `privateUser` which is already a dependency.
						// eslint-disable-next-line react-hooks/exhaustive-deps
					}, [privateUser])
				}
				enableReinitialize
			>
				{({ isSubmitting, dirty, values }) => {
					useLeaveConfirmation(dirty);

					return (
						<Form>
							<Box>
								<BoxColumns>
									<BoxRowSection heading="Info">
										<FieldBoxRow
											name="name"
											label="Username"
											autoComplete="username"
											required
											maxLength={32}
										/>
										<FieldBoxRow
											type="url"
											name="icon"
											label="Icon URL"
										/>
										<FieldBoxRow
											type="checkbox"
											name="settings.favsPublic"
											label="Public Favorites"
											help="Allows others to publicly view your favorite adventures."
										/>
										<BoxRow>
											<IconImage
												id="profile-icon"
												src={values.icon}
												alt="Your Profile Icon"
												title="Your Profile Icon"
											/>
										</BoxRow>
									</BoxRowSection>
									<Box>
										<BoxRowSection heading="Stats">
											<LabeledBoxRow htmlFor="field-birthdate-year" label="Birthdate">
												<BirthdateField required />
											</LabeledBoxRow>
											<FieldBoxRow
												type="checkbox"
												name="settings.birthdatePublic"
												label="Public Birthdate"
												help="Shows your birthdate publicly on your profile."
											/>
										</BoxRowSection>
										<BoxRowSection heading="Contact">
											<FieldBoxRow
												type="email"
												name="email"
												label="Email"
												required
											/>
											<FieldBoxRow
												type="checkbox"
												name="settings.emailPublic"
												label="Public Email"
												help="Shows your email publicly on your profile."
											/>
											<FieldBoxRow
												type="url"
												name="site"
												label="Website"
											/>
										</BoxRowSection>
									</Box>
								</BoxColumns>
								<BoxSection heading="Description">
									<Label htmlFor="field-description">
										Description
									</Label>
									<BBField
										name="description"
										rows={8}
										maxLength={2000}
										html
									/>
								</BoxSection>
								<BoxSection heading="Advanced" collapsible>
									<Label htmlFor="field-style">
										Custom Profile Style
									</Label>
									<Field
										as="textarea"
										id="field-style"
										name="profileStyle"
										rows={5}
										placeholder={'Paste SCSS here.\nIf you don\'t know what this is, don\'t worry about it.'}
									/>
								</BoxSection>
								<BoxFooter>
									<Button
										type="submit"
										className="alt"
										disabled={!dirty || isSubmitting}
									>
										Save
									</Button>
									<Button href={`/user/${privateUser.id}`}>
										Back to Profile
									</Button>
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
			privateUser: getPrivateUser(user!)
		}
	};
});