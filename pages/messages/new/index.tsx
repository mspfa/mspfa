import './styles.module.scss';
import Page from 'components/Page';
import type { PublicUser } from 'modules/client/users';
import { getUser, signIn } from 'modules/client/users';
import type { FormikHelpers } from 'formik';
import { Field, Form, Formik } from 'formik';
import { useCallback } from 'react';
import { useLeaveConfirmation } from 'modules/client/forms';
import Box from 'components/Box';
import BoxFooter from 'components/Box/BoxFooter';
import Button from 'components/Button';
import type { APIClient } from 'modules/client/api';
import api from 'modules/client/api';
import Label from 'components/Label';
import BBCodeField from 'components/BBCode/BBCodeField';
import BoxSection from 'components/Box/BoxSection';
import { Dialog } from 'modules/client/dialogs';
import UserField from 'components/UserField';
import type { MyGetServerSideProps } from 'modules/server/pages';
import type { UserDocument } from 'modules/server/users';
import { getPublicUser, getUserByUnsafeID } from 'modules/server/users';

type MessagesAPI = APIClient<typeof import('pages/api/messages').default>;

const initialValues = {
	to: [] as PublicUser[] as unknown as PublicUser,
	subject: '',
	content: ''
};

type Values = typeof initialValues;

type ServerSideProps = {
	initialTo?: PublicUser[]
};

const Component = ({ initialTo = [] }: ServerSideProps) => (
	<Page flashyTitle heading="Messages">
		<Formik
			initialValues={{
				...initialValues,
				to: initialTo[0]
			}}
			onSubmit={
				useCallback(async (
					values: Values,
					{ setSubmitting }: FormikHelpers<Values>
				) => {
					if (!getUser()) {
						setSubmitting(false);

						if (await Dialog.confirm({
							id: 'send-message',
							title: 'Send Message',
							content: "Sign in to send your message!\n\n(Don't worry, your message won't be lost if you don't leave the page.)",
							actions: ['Sign In', 'Cancel']
						})) {
							signIn();
						}

						return;
					}

					(api as MessagesAPI).post('/messages', values);
				}, [])
			}
		>
			{({ isSubmitting, dirty }) => {
				// This ESLint comment is necessary because ESLint is empirically wrong here.
				// eslint-disable-next-line react-hooks/rules-of-hooks
				useLeaveConfirmation(dirty);

				return (
					<Form>
						<Box>
							<BoxSection heading="New Message">
								<div className="field-container">
									<Label htmlFor="field-to">
										To
									</Label>
									<UserField
										name="to"
										required
										formikField
									/>
								</div>
								<div className="field-container">
									<Label htmlFor="field-subject">
										Subject
									</Label>
									<Field
										id="field-subject"
										name="subject"
										required
										autoFocus
										maxLength={50}
										autoComplete="off"
									/>
								</div>
								<div className="field-container">
									<Label htmlFor="field-description">
										Content
									</Label>
									<BBCodeField
										name="content"
										required
										rows={16}
										maxLength={20000}
									/>
								</div>
							</BoxSection>
							<BoxFooter>
								<Button
									type="submit"
									className="alt"
									disabled={isSubmitting}
								>
									Send
								</Button>
							</BoxFooter>
						</Box>
					</Form>
				);
			}}
		</Formik>
	</Page>
);

export default Component;

export const getServerSideProps: MyGetServerSideProps<ServerSideProps> = async ({ query }) => {
	const to = typeof query.to === 'string' ? [query.to] : query.to || [];

	return {
		props: {
			initialTo: (
				(
					(await Promise.all(
						to.map(getUserByUnsafeID)
					)).filter(Boolean) as UserDocument[]
				).map(getPublicUser)
			)
		}
	};
};