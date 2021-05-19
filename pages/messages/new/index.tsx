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
import type { MyGetServerSideProps } from 'modules/server/pages';
import type { UserDocument } from 'modules/server/users';
import { getPublicUser, getUserByUnsafeID } from 'modules/server/users';
import UserArrayField from 'components/UserField/UserArrayField';
import { useUserCache } from 'modules/client/UserCache';
import Router from 'next/router';

type MessagesAPI = APIClient<typeof import('pages/api/messages').default>;

const initialValues = {
	to: [undefined] as Array<string | undefined>,
	subject: '',
	content: ''
};

type Values = typeof initialValues;

type ServerSideProps = {
	toUsers?: PublicUser[]
};

const Component = ({ toUsers = [] }: ServerSideProps) => {
	const { cacheUser } = useUserCache();

	toUsers.forEach(cacheUser);

	return (
		<Page flashyTitle heading="Messages">
			<Formik<Values>
				initialValues={{
					...initialValues,
					to: (
						toUsers.length
							? toUsers.map(({ id }) => id)
							: [undefined]
					)
				}}
				onSubmit={
					useCallback(async (
						values: Values,
						{ setSubmitting, resetForm }: FormikHelpers<Values>
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

						const { data: message } = await (api as MessagesAPI).post('/messages', {
							...values,
							to: values.to.filter(Boolean) as string[]
						});

						// After the message is sent, reset the form so its state doesn't get messed up if the user comes back to the page through their tab's history.
						resetForm();

						// This needs to be `await`ed so `isSubmitting` remains `true` while the router loads, ensuring `useLeaveConfirmation`'s argument is `false`.
						await Router.push(`/messages/${message.id}`);
					}, [])
				}
			>
				{({ isSubmitting, dirty }) => {
					// This ESLint comment is necessary because ESLint is empirically wrong here.
					// eslint-disable-next-line react-hooks/rules-of-hooks
					useLeaveConfirmation(dirty && !isSubmitting);

					return (
						<Form>
							<Box>
								<BoxSection heading="New Message">
									<div className="field-container">
										<Label htmlFor="field-to">
											To
										</Label>
										<UserArrayField
											name="to"
											required
											unique
											autoFocus={toUsers.length === 0}
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
											maxLength={50}
											autoComplete="off"
											autoFocus={toUsers.length !== 0}
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
};

export default Component;

export const getServerSideProps: MyGetServerSideProps<ServerSideProps> = async ({ query }) => {
	const toUserIDs = typeof query.to === 'string' ? [query.to] : query.to || [];

	return {
		props: {
			toUsers: (
				(
					(await Promise.all(
						toUserIDs.map(userID => getUserByUnsafeID(userID))
					)).filter(Boolean) as UserDocument[]
				).map(getPublicUser)
			)
		}
	};
};