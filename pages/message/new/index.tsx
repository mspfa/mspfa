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
import BBField from 'components/BBCode/BBField';
import BoxSection from 'components/Box/BoxSection';
import { Dialog } from 'modules/client/dialogs';
import users, { getPublicUser } from 'modules/server/users';
import UserArrayField from 'components/UserField/UserArrayField';
import { useUserCache } from 'modules/client/UserCache';
import Router from 'next/router';
import { uniq } from 'lodash';
import type { ClientMessage } from 'modules/client/messages';
import { withErrorPage } from 'modules/client/errors';
import { getClientMessage, getMessageByUnsafeID } from 'modules/server/messages';
import { Perm } from 'modules/client/perms';
import { withStatusCode } from 'modules/server/errors';
import Link from 'components/Link';
import { safeObjectID } from 'modules/server/db';
import type { ObjectId } from 'mongodb';

type MessagesAPI = APIClient<typeof import('pages/api/messages').default>;

type Values = {
	content: string
} & (
	{
		to: Array<string | undefined>,
		subject: string
	} | {
		to?: never,
		subject?: never
	}
);

type ServerSideProps = {
	replyTo: ClientMessage,
	toUsers?: never
} | {
	replyTo?: never,
	toUsers: PublicUser[]
} | {
	statusCode: number
};

const Component = withErrorPage<ServerSideProps>(({ replyTo, toUsers }) => {
	const { cacheUser } = useUserCache();

	toUsers?.forEach(cacheUser);

	return (
		<Page flashyTitle heading="Messages">
			<Formik<Values>
				initialValues={{
					content: '',
					...toUsers && {
						to: (
							toUsers.length
								? toUsers.map(({ id }) => id)
								: [undefined]
						),
						subject: ''
					}
				} as Values}
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
								content: 'Sign in to send your message!\n\n(Don\'t worry, your message won\'t be lost if you don\'t leave the page.)',
								actions: ['Sign In', 'Cancel']
							})) {
								signIn();
							}

							return;
						}

						const { data: message } = await (api as MessagesAPI).post('/messages', {
							...replyTo
								? {
									replyTo: replyTo.id
								}
								: {
									to: values.to!.filter(Boolean) as string[],
									subject: values.subject!
								},
							content: values.content
						});

						// After the message is sent, reset the form so its state doesn't get messed up if the user comes back to the page through their browser's history.
						resetForm();

						// This needs to be `await`ed so `isSubmitting` remains `true` while the router loads, ensuring `useLeaveConfirmation`'s argument is `false`.
						await Router.push(`/message/${message.id}`);
					}, [replyTo])
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
									{toUsers ? (
										<>
											<div className="field-container">
												<Label htmlFor="field-to">
													To
												</Label>
												<div>
													<UserArrayField
														name="to"
														required
														unique
														autoFocus={!toUsers.length}
													/>
												</div>
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
													autoFocus={!!toUsers.length}
												/>
											</div>
										</>
									) : (
										<div className="field-container">
											<Label className="spaced">Reply To</Label>
											<Link
												className="spaced"
												href={`/message/${replyTo!.id}`}
											>
												{replyTo!.subject}
											</Link>
										</div>
									)}
									<div className="field-container">
										<Label htmlFor="field-content">
											Content
										</Label>
										<BBField
											name="content"
											required
											rows={16}
											maxLength={20000}
											autoFocus={!!replyTo}
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
});

export default Component;

export const getServerSideProps = withStatusCode<ServerSideProps>(async ({ req, query }) => {
	if (typeof query.replyTo === 'string') {
		const message = await getMessageByUnsafeID(query.replyTo);

		if (!(
			message && req.user && (
				message.notDeletedBy.some(userID => userID.equals(req.user!._id))
				|| req.user.perms & Perm.sudoRead
			)
		)) {
			return { props: { statusCode: 403 } };
		}

		return {
			props: {
				replyTo: getClientMessage(message, req.user)
			}
		};
	}

	const toUserIDs = (
		typeof query.to === 'string'
			? [query.to]
			: query.to
				? uniq(query.to)
				: []
	).map(safeObjectID).filter(Boolean) as ObjectId[];

	return {
		props: {
			toUsers: (
				await users.find!({
					_id: {
						$in: toUserIDs
					},
					willDelete: { $exists: false }
				}).map(getPublicUser).toArray()
			)
		}
	};
});