import './styles.module.scss';
import Page from 'components/Page';
import { withErrorPage } from 'lib/client/errors';
import withStatusCode from 'lib/server/withStatusCode';
import Section from 'components/Section';
import { Perm } from 'lib/client/perms';
import messages, { getClientMessage } from 'lib/server/messages';
import updateUnreadMessages from 'lib/server/messages/updateUnreadMessages';
import getMessageByUnsafeID from 'lib/server/messages/getMessageByUnsafeID';
import type { ClientMessage } from 'lib/client/messages';
import BBCode from 'components/BBCode';
import users, { getPublicUser } from 'lib/server/users';
import type { PublicUser } from 'lib/client/users';
import { useUser, setUser } from 'lib/client/reactContexts/UserContext';
import { uniqBy } from 'lodash';
import { useUserCache } from 'lib/client/reactContexts/UserCache';
import Link from 'components/Link';
import { Fragment, useState } from 'react';
import useFunction from 'lib/client/reactHooks/useFunction';
import Timestamp from 'components/Timestamp';
import Button from 'components/Button';
import BottomActions from 'components/BottomActions';
import type { APIClient } from 'lib/client/api';
import api from 'lib/client/api';
import Router from 'next/router';
import Dialog from 'lib/client/Dialog';
import Label from 'components/Label';
import BBField from 'components/BBCode/BBField';
import { Form, Formik } from 'formik';
import { useLeaveConfirmation } from 'lib/client/forms';
import UserLink from 'components/Link/UserLink';
import useIsomorphicLayoutEffect from 'lib/client/reactHooks/useIsomorphicLayoutEffect';
import type { integer } from 'lib/types';
import useSubmitOnSave from 'lib/client/reactHooks/useSubmitOnSave';

type MessageAPI = APIClient<typeof import('pages/api/messages/[messageID]').default>;
type MessageDeletedByUserAPI = APIClient<typeof import('pages/api/messages/[messageID]/deletedBy/[userID]').default>;

type ServerSideProps = {
	unreadMessageCount?: integer,
	message: ClientMessage,
	replyTo?: ClientMessage,
	userCache: PublicUser[]
} | {
	statusCode: integer
};

const Component = withErrorPage<ServerSideProps>(({
	unreadMessageCount,
	message,
	replyTo,
	userCache: initialUserCache
}) => {
	const user = useUser()!;

	const [editing, setEditing] = useState(false);

	const [unreadMessageCountUpdated, setUnreadMessageCountUpdated] = useState(unreadMessageCount === undefined);

	// Update the user's unread message count to the one received from the server-side props.
	useIsomorphicLayoutEffect(() => {
		if (!unreadMessageCountUpdated) {
			setUser({
				...user,
				// Non-nullability can be asserted here because `unreadMessageCountUpdated` can only be false if `unreadMessageCount !== undefined`.
				unreadMessageCount: unreadMessageCount!
			});

			setUnreadMessageCountUpdated(true);
		}
	}, [unreadMessageCount, user, unreadMessageCountUpdated]);

	const { cacheUser } = useUserCache();
	initialUserCache.forEach(cacheUser);

	const onClickDelete	= useFunction(async () => {
		if (!await Dialog.confirm({
			id: 'delete-message',
			title: 'Delete Message',
			content: 'Are you sure you want to delete this message?\n\nThe message will only be deleted for you.'
		})) {
			return;
		}

		await (api as MessageDeletedByUserAPI).put(`/messages/${message.id}/deletedBy/${user.id}`, true);

		Router.push(`/users/${user.id}/messages`);
	});

	const edit = useFunction(() => {
		setEditing(true);
	});

	return (
		<Page withFlashyTitle heading="Messages">
			<Formik
				initialValues={{ content: message.content }}
				onSubmit={
					useFunction(async (values: { content: string }) => {
						const { data: newMessage } = await (api as MessageAPI).patch(`/messages/${message.id}`, values);

						// Clear the `message` object and assign new properties to it from `newMessage`.
						for (const key of Object.keys(message)) {
							delete message[key as keyof ClientMessage];
						}
						Object.assign(message, newMessage);

						// Because the above assignment mutates the original `message` object without using a state setter, a state change such as the one below is necessary to re-render the component with the new version of `message`.
						// It is necessary to mutate the original `message` object instead of using a state because a state would not update when a new `message` prop is passed into the page.

						setEditing(false);
					})
				}
				enableReinitialize
			>
				{({ dirty, isSubmitting, resetForm, submitForm }) => {
					const shouldLeave = useLeaveConfirmation(dirty);

					const cancel = useFunction(() => {
						if (shouldLeave()) {
							// In case the user decides to start editing again, reset the dirty values.
							resetForm();

							setEditing(false);
						}
					});

					return (
						<Form
							id="message"
							className={editing ? 'editing' : undefined}
							ref={useSubmitOnSave({ submitForm, dirty, isSubmitting }, editing)}
						>
							<Section
								id="message-info"
								heading={message.subject}
							>
								{message.replyTo && (
									<div id="message-reply-to">
										{'Reply To: '}
										{replyTo ? (
											<Link href={`/messages/${replyTo.id}`}>
												{replyTo.subject}
											</Link>
										) : (
											<span title={`ID: ${message.replyTo}`}>
												(Deleted Message)
											</span>
										)}
									</div>
								)}
								<div id="message-from">
									{'From: '}
									<UserLink>{message.from}</UserLink>
								</div>
								<div id="message-to">
									{'To: '}
									{message.to.map((userID, i) => (
										<Fragment key={userID}>
											{i !== 0 && ', '}
											<UserLink>{userID}</UserLink>
										</Fragment>
									))}
								</div>
								<div id="message-sent">
									{'Sent: '}
									<Timestamp
										relative
										withTime
										edited={message.edited}
									>
										{message.sent}
									</Timestamp>
								</div>
							</Section>
							<Section id="message-content">
								{editing ? (
									<>
										<Label block htmlFor="field-content">
											Content
										</Label>
										<BBField
											name="content"
											required
											rows={16}
											maxLength={20000}
											autoFocus
										/>
									</>
								) : (
									<BBCode>{message.content}</BBCode>
								)}
							</Section>
							<BottomActions>
								{editing ? (
									<>
										<Button
											type="submit"
											className="alt"
											disabled={!dirty || isSubmitting}
										>
											Save
										</Button>
										<Button
											disabled={isSubmitting}
											onClick={cancel}
										>
											Cancel
										</Button>
									</>
								) : (
									<>
										<Button href={`/users/${user.id}/messages`}>
											All Messages
										</Button>
										<Button href={`/messages/new?replyTo=${message.id}`}>
											Reply
										</Button>
										{(
											message.from === user.id
											|| !!(user.perms & Perm.sudoWrite)
										) && (
											<Button onClick={edit}>
												Edit
											</Button>
										)}
										<Button onClick={onClickDelete}>
											Delete
										</Button>
									</>
								)}
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
	const message = await getMessageByUnsafeID(params.messageID);

	if (!(
		message && req.user && (
			message.notDeletedBy.some(userID => userID.equals(req.user!._id))
			|| req.user.perms & Perm.sudoRead
		)
	)) {
		return { props: { statusCode: 403 } };
	}

	let unreadMessageCount: integer | undefined;

	// If the message is unread, mark it as read.
	if (message.notReadBy.some(userID => userID.equals(req.user!._id))) {
		await messages.updateOne({
			_id: message._id
		}, {
			$pull: {
				notReadBy: req.user._id
			}
		});

		// Update the unread message count being sent to the client.
		unreadMessageCount = await updateUnreadMessages(req.user._id);
	}

	const userCacheIDs = uniqBy([message.from, ...message.to], String);

	const replyTo = message.replyTo && await messages.findOne({ _id: message.replyTo });

	return {
		props: {
			...unreadMessageCount !== undefined && {
				unreadMessageCount
			},
			message: getClientMessage(message, req.user),
			...replyTo && (
				replyTo.notDeletedBy.some(userID => userID.equals(req.user!._id))
				|| req.user.perms & Perm.sudoRead
			) && {
				replyTo: getClientMessage(replyTo, req.user)
			},
			userCache: (
				await users.find!({
					_id: { $in: userCacheIDs },
					willDelete: { $exists: false }
				}).map(getPublicUser).toArray()
			)
		}
	};
});