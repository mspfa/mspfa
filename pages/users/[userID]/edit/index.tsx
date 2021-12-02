import Page from 'components/Page';
import { getUser, setUser } from 'lib/client/reactContexts/UserContext';
import type { PrivateUser } from 'lib/client/users';
import { Perm } from 'lib/client/perms';
import { permToGetUserInPage } from 'lib/server/users/permToGetUser';
import { getPrivateUser } from 'lib/server/users';
import { withErrorPage } from 'lib/client/errors';
import withStatusCode from 'lib/server/withStatusCode';
import { Field, Form, Formik } from 'formik';
import { useState } from 'react';
import useFunction from 'lib/client/reactHooks/useFunction';
import { getChangedValues, useLeaveConfirmation } from 'lib/client/forms';
import Columns from 'components/Columns';
import Section from 'components/Section';
import LabeledGridSection from 'components/Section/LabeledGridSection';
import BottomActions from 'components/BottomActions';
import Button from 'components/Button';
import api from 'lib/client/api';
import type { APIClient } from 'lib/client/api';
import LabeledGridField from 'components/LabeledGrid/LabeledGridField';
import IconImage from 'components/IconImage';
import Label from 'components/Label';
import Row from 'components/Row';
import BirthdateGridRow from 'components/LabeledGrid/LabeledGridRow/BirthdateGridRow';
import BBField from 'components/BBCode/BBField';
import type { integer } from 'lib/types';
import useSubmitOnSave from 'lib/client/reactHooks/useSubmitOnSave';

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

						const { data } = await (api as UserAPI).patch(
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
				{({ isSubmitting, dirty, values, submitForm }) => {
					useLeaveConfirmation(dirty);

					return (
						<Form
							ref={useSubmitOnSave({ submitForm, dirty, isSubmitting })}
						>
							<Columns ofSections>
								<LabeledGridSection heading="Info">
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
								</LabeledGridSection>
								<div>
									<LabeledGridSection heading="Stats">
										<BirthdateGridRow
											birthdateChanged={privateUser.birthdateChanged}
										/>
										<LabeledGridField
											type="checkbox"
											name="settings.birthdatePublic"
											label="Public Birthdate"
											help="Shows your birthdate publicly on your profile."
										/>
									</LabeledGridSection>
									<LabeledGridSection heading="Contact">
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
									</LabeledGridSection>
								</div>
							</Columns>
							<Section heading="Description">
								<Label block htmlFor="field-description">
									Description
								</Label>
								<BBField
									name="description"
									rows={8}
									maxLength={2000}
									keepHTMLTags
								/>
							</Section>
							<Section heading="Advanced" collapsible>
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
							</Section>
							<BottomActions>
								<Button
									type="submit"
									className="alt"
									disabled={!dirty || isSubmitting}
								>
									Save
								</Button>
								<Button href={`/users/${privateUser.id}`}>
									Back to Profile
								</Button>
							</BottomActions>
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