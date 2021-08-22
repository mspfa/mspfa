import Page from 'components/Page';
import { getUser, setUser } from 'lib/client/users';
import type { PrivateUser } from 'lib/client/users';
import { Perm } from 'lib/client/perms';
import { permToGetUserInPage } from 'lib/server/permToGetUser';
import { getPrivateUser } from 'lib/server/users';
import { withErrorPage } from 'lib/client/errors';
import { withStatusCode } from 'lib/server/errors';
import { Field, Form, Formik } from 'formik';
import { useState } from 'react';
import useFunction from 'lib/client/useFunction';
import { getChangedValues, useLeaveConfirmation } from 'lib/client/forms';
import Box from 'components/Box';
import BoxColumns from 'components/Box/BoxColumns';
import BoxSection from 'components/Box/BoxSection';
import LabeledGridBoxSection from 'components/Box/LabeledGridBoxSection';
import BoxFooter from 'components/Box/BoxFooter';
import Button from 'components/Button';
import api from 'lib/client/api';
import type { APIClient } from 'lib/client/api';
import LabeledGridField from 'components/LabeledGrid/LabeledGridField';
import IconImage from 'components/IconImage';
import Label from 'components/Label';
import LabeledGridRow from 'components/LabeledGrid/LabeledGridRow';
import Row from 'components/Row';
import BirthdateField from 'components/DateField/BirthdateField';
import BBField from 'components/BBCode/BBField';
import type { integer } from 'lib/types';

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
	statusCode: integer
};

const Component = withErrorPage<ServerSideProps>(({ privateUser: initialPrivateUser }) => {
	const [privateUser, setPrivateUser] = useState(initialPrivateUser);

	const initialValues = getValuesFromUser(privateUser);

	return (
		<Page withFlashyTitle heading="Edit Profile">
			<Formik
				initialValues={initialValues}
				onSubmit={
					useFunction(async (values: Values) => {
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
					})
				}
				enableReinitialize
			>
				{({ isSubmitting, dirty, values }) => {
					useLeaveConfirmation(dirty);

					return (
						<Form>
							<Box>
								<BoxColumns>
									<LabeledGridBoxSection heading="Info">
										<LabeledGridField
											name="name"
											label="Username"
											autoComplete="username"
											required
											maxLength={32}
										/>
										<LabeledGridField
											type="url"
											name="icon"
											label="Icon URL"
										/>
										<LabeledGridField
											type="checkbox"
											name="settings.favsPublic"
											// "Favorites" is shortened to "Favs" here because fitting the label on one line looks nicer.
											label="Public Favs"
											help="Allows others to publicly view your favorite adventures."
										/>
										<Row>
											<IconImage
												id="profile-icon"
												src={values.icon}
												alt="Your Profile Icon"
											/>
										</Row>
									</LabeledGridBoxSection>
									<Box>
										<LabeledGridBoxSection heading="Stats">
											<LabeledGridRow htmlFor="field-birthdate-year" label="Birthdate">
												<BirthdateField required />
											</LabeledGridRow>
											<LabeledGridField
												type="checkbox"
												name="settings.birthdatePublic"
												label="Public Birthdate"
												help="Shows your birthdate publicly on your profile."
											/>
										</LabeledGridBoxSection>
										<LabeledGridBoxSection heading="Contact">
											<LabeledGridField
												type="email"
												name="email"
												label="Email"
												required
											/>
											<LabeledGridField
												type="checkbox"
												name="settings.emailPublic"
												label="Public Email"
												help="Shows your email publicly on your profile."
											/>
											<LabeledGridField
												type="url"
												name="site"
												label="Website"
											/>
										</LabeledGridBoxSection>
									</Box>
								</BoxColumns>
								<BoxSection heading="Description">
									<Label block htmlFor="field-description">
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
									<Label block htmlFor="field-style">
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