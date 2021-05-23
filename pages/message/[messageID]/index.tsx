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
import type { UserDocument } from 'modules/server/users';
import users, { getPublicUser } from 'modules/server/users';
import type { PublicUser } from 'modules/client/users';
import { useUser } from 'modules/client/users';
import { uniqBy } from 'lodash';
import { useUserCache } from 'modules/client/UserCache';
import Link from 'components/Link';
import { Fragment, useCallback } from 'react';
import Timestamp from 'components/Timestamp';
import Button from 'components/Button';
import BoxFooter from 'components/Box/BoxFooter';
import type { APIClient } from 'modules/client/api';
import api from 'modules/client/api';
import Router from 'next/router';
import { Dialog } from 'modules/client/dialogs';

type MessageAPI = APIClient<typeof import('pages/api/messages/[messageID]').default>;
type MessageDeletedByAPI = APIClient<typeof import('pages/api/messages/[messageID]/deletedBy').default>;

type ServerSideProps = {
	message: ClientMessage,
	userCache: PublicUser[]
} | {
	statusCode: number
};

const Component = withErrorPage<ServerSideProps>(({ message, userCache: initialUserCache }) => {
	const user = useUser()!;

	const { cacheUser, userCache } = useUserCache();
	initialUserCache.forEach(cacheUser);

	const fromUser = userCache[message.from]!;
	const toUsers = message.to.map(userID => userCache[userID]!);

	return (
		<Page flashyTitle heading="Message">
			<Box>
				<BoxSection
					id="message-meta"
					heading={message.subject}
				>
					<div id="message-from">
						{'From: '}
						<Link href={`/user/${fromUser.id}`}>
							{fromUser.name}
						</Link>
					</div>
					<div id="message-to">
						{'To: '}
						{toUsers.map((toUser, index) => (
							<Fragment key={toUser.id}>
								{index !== 0 && ', '}
								<Link href={`/user/${toUser.id}`}>
									{toUser.name}
								</Link>
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
					<BBCode>{message.content}</BBCode>
				</BoxSection>
				<BoxFooter>
					<Button href={`/user/${user.id}/messages`}>
						All Messages
					</Button>
					<Button href={`/message/new?replyTo=${message.id}`}>
						Reply
					</Button>
					<Button
						onClick={
							useCallback(async () => {
								if (!await Dialog.confirm({
									title: 'Delete Message',
									content: 'Are you sure you want to delete this message?\n\nThe message will only be deleted for you.'
								})) {
									return;
								}

								await (api as MessageDeletedByAPI).post(`/message/${message.id}/deletedBy`, {
									user: user.id
								});

								Router.push(`/user/${user.id}/messages`);
							}, [message.id, user.id])
						}
					>
						Delete
					</Button>
				</BoxFooter>
			</Box>
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
		req.initialProps.user!.unreadMessageCount = await updateUnreadMessages(req.user._id);
	}

	const userCacheIDs = uniqBy([message.from, ...message.to], String);

	return {
		props: {
			message: getClientMessage(message),
			userCache: (
				(
					(
						await Promise.all(userCacheIDs.map(
							userID => users.findOne({ _id: userID })
						))
					).filter(Boolean) as UserDocument[]
				).map(getPublicUser)
			)
		}
	};
});