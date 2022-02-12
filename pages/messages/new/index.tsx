import './styles.module.scss';
import Page from 'components/Page';
import type { PublicUser } from 'lib/client/users';
import { getUser } from 'lib/client/reactContexts/UserContext';
import type { FormikHelpers } from 'formik';
import { Field, Form, Formik } from 'formik';
import useFunction from 'lib/client/reactHooks/useFunction';
import { useLeaveConfirmation } from 'lib/client/forms';
import BottomActions from 'components/BottomActions';
import Button from 'components/Button';
import type { APIClient } from 'lib/client/api';
import api from 'lib/client/api';
import Label from 'components/Label';
import BBField from 'components/BBCode/BBField';
import Section from 'components/Section';
import Dialog from 'lib/client/Dialog';
import users, { getPublicUser } from 'lib/server/users';
import UserArrayField from 'components/UserField/UserArrayField';
import { useUserCache } from 'lib/client/reactContexts/UserCache';
import Router from 'next/router';
import { uniq } from 'lodash';
import type { ClientMessage } from 'lib/client/messages';
import { withErrorPage } from 'lib/client/errors';
import { getClientMessage } from 'lib/server/messages';
import getMessageByUnsafeID from 'lib/server/messages/getMessageByUnsafeID';
import { Perm } from 'lib/client/perms';
import withStatusCode from 'lib/server/withStatusCode';
import Link from 'components/Link';
import parseID from 'lib/server/db/parseID';
import type { ObjectId } from 'mongodb';
import type { integer } from 'lib/types';
import promptSignIn from 'lib/client/promptSignIn';
import Row from 'components/Row';

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
	statusCode: integer
};

const Component = withErrorPage<ServerSideProps>(({ replyTo, toUsers }) => {
	const { cacheUser } = useUserCache();

	toUsers?.forEach(cacheUser);

	return (
		<Page withFlashyTitle heading="Messages">
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
					useFunction(async (
						values: Values,
						{ setSubmitting }: FormikHelpers<Values>
					) => {
						if (!getUser()) {
							setSubmitting(false);

							if (await Dialog.confirm({
								id: 'send-message',
								title: 'Send Message',
								content: 'Sign in to send your message!\n\n(Don\'t worry, your message won\'t be lost if you don\'t leave the page.)',
								actions: ['Sign In', 'Cancel']
							})) {
								promptSignIn();
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

						// This needs to be `await`ed so `isSubmitting` remains `true` while the router loads, ensuring `useLeaveConfirmation`'s argument is `false`.
						await Router.push(`/messages/${message.id}`);
					})
				}
			>
				{({ isSubmitting, dirty }) => {
					useLeaveConfirmation(dirty && !isSubmitting);

					return (
						<Form>
							<Section heading="New Message">
								{toUsers ? (
									<>
										<Row>
											<Label block htmlFor="field-to">
												To
											</Label>
											<UserArrayField
												name="to"
												required
												unique
												autoFocus={toUsers.length === 0}
											/>
										</Row>
										<Row>
											<Label block htmlFor="field-subject">
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
										</Row>
									</>
								) : (
									<Row>
										<Label className="spaced">
											Reply To
										</Label>
										<Link
											className="spaced"
											href={`/messages/${replyTo!.id}`}
										>
											{replyTo!.subject}
										</Link>
									</Row>
								)}
								<Row>
									<Label block htmlFor="field-content">
										Content
									</Label>
									<BBField
										name="content"
										required
										rows={16}
										maxLength={20000}
										autoFocus={replyTo !== undefined}
									/>
								</Row>
							</Section>
							<BottomActions>
								<Button
									type="submit"
									className="alt"
									disabled={isSubmitting}
								>
									Send
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
	).map(parseID).filter(Boolean) as ObjectId[];

	return {
		props: {
			toUsers: (
				await users.find!({
					_id: { $in: toUserIDs },
					willDelete: { $exists: false }
				}).map(getPublicUser).toArray()
			)
		}
	};
});