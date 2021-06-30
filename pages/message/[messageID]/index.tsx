import './styles.module.scss';
import Page from 'components/Page';
import { withErrorPage } from 'modules/client/errors';
import { withStatusCode } from 'modules/server/errors';
import Box from 'components/Box';
import BoxSection from 'components/Box/BoxSection';
import { Perm } from 'modules/client/perms';
import messages, { getClientMessage, getMessageByUnsafeID, updateUnreadMessages } from 'modules/server/messages';
import type { ClientMessage } from 'modules/client/messages';
import BBCode from 'components/BBCode';
import users, { getPublicUser } from 'modules/server/users';
import type { PublicUser } from 'modules/client/users';
import { useUser, setUser } from 'modules/client/users';
import { uniqBy } from 'lodash';
import { useUserCache } from 'modules/client/UserCache';
import Link from 'components/Link';
import { Fragment, useCallback, useState } from 'react';
import Timestamp from 'components/Timestamp';
import Button from 'components/Button';
import BoxFooter from 'components/Box/BoxFooter';
import type { APIClient } from 'modules/client/api';
import api from 'modules/client/api';
import Router from 'next/router';
import { Dialog } from 'modules/client/dialogs';
import Label from 'components/Label';
import BBField from 'components/BBCode/BBField';
import { Form, Formik } from 'formik';
import { useLeaveConfirmation } from 'modules/client/forms';
import UserLink from 'components/Link/UserLink';
import { useIsomorphicLayoutEffect } from 'react-use';

type MessageAPI = APIClient<typeof import('pages/api/messages/[messageID]').default>;
type MessageDeletedByAPI = APIClient<typeof import('pages/api/messages/[messageID]/deletedBy').default>;

type ServerSideProps = {
	unreadMessageCount?: number,
	message: ClientMessage,
	replyTo?: ClientMessage,
	userCache: PublicUser[]
} | {
	statusCode: number
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

	const onClickDelete	= useCallback(async () => {
		if (!await Dialog.confirm({
			id: 'delete-message',
			title: 'Delete Message',
			content: 'Are you sure you want to delete this message?\n\nThe message will only be deleted for you.'
		})) {
			return;
		}

		await (api as MessageDeletedByAPI).post(`/messages/${message.id}/deletedBy`, {
			userID: user.id
		});

		Router.push(`/user/${user.id}/messages`);
	}, [message.id, user.id]);

	const edit = useCallback(() => {
		setEditing(true);
	}, []);

	return (
		<Page flashyTitle heading="Messages">
			<Formik
				initialValues={{ content: message.content }}
				onSubmit={
					useCallback(async (values: { content: string }) => {
						const { data: newMessage } = await (api as MessageAPI).put(`/messages/${message.id}`, values);

						// Clear the `message` object and assign new properties to it from `newMessage`.
						for (const key in message) {
							delete message[key as keyof ClientMessage];
						}
						Object.assign(message, newMessage);

						// Because the above assignment mutates the original `message` object without using a state setter, a state change such as the one below is necessary to re-render the component with the new version of `message`.
						// It is necessary to mutate the original `message` object instead of using a state because a state would not update when a new `message` prop is passed into the page.

						setEditing(false);
					}, [message])
				}
				enableReinitialize
			>
				{({ dirty, isSubmitting, resetForm }) => {
					const shouldLeave = useLeaveConfirmation(dirty);

					const cancel = useCallback(() => {
						if (shouldLeave()) {
							// In case the user decides to start editing again, reset the dirty values.
							resetForm();

							setEditing(false);
						}
					}, [resetForm, shouldLeave]);

					return (
						<Form>
							<Box>
								<BoxSection
									id="message-info"
									heading={message.subject}
								>
									{message.replyTo && (
										<div id="message-reply-to">
											{'Reply To: '}
											{replyTo ? (
												<Link href={`/message/${replyTo.id}`}>
													{replyTo.subject}
												</Link>
											) : (
												<span title={`ID: ${message.replyTo}`}>
													[Deleted Message]
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
										{message.to.map((userID, index) => (
											<Fragment key={userID}>
												{index !== 0 && ', '}
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
								</BoxSection>
								<BoxSection id="message-content">
									{editing ? (
										<>
											<Label htmlFor="field-content">
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
								</BoxSection>
								<BoxFooter>
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
											<Button href={`/user/${user.id}/messages`}>
												All Messages
											</Button>
											<Button href={`/message/new?replyTo=${message.id}`}>
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
	const message = await getMessageByUnsafeID(params.messageID);

	if (!(
		message && req.user && (
			message.notDeletedBy.some(userID => userID.equals(req.user!._id))
			|| req.user.perms & Perm.sudoRead
		)
	)) {
		return { props: { statusCode: 403 } };
	}

	let unreadMessageCount: number | undefined;

	// If the message is unread, mark it as read.
	if (message.notReadBy.some(userID => userID.equals(req.user!._id))) {
		messages.updateOne({
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
					_id: {
						$in: userCacheIDs
					},
					willDelete: { $exists: false }
				}).map(getPublicUser).toArray()
			)
		}
	};
});