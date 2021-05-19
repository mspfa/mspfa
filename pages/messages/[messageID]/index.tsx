import './styles.module.scss';
import Page from 'components/Page';
import { withErrorPage } from 'modules/client/errors';
import { withStatusCode } from 'modules/server/errors';
import Box from 'components/Box';
import BoxSection from 'components/Box/BoxSection';
import { Perm } from 'modules/client/perms';
import { getClientMessage, getMessageByUnsafeID } from 'modules/server/messages';
import type { ClientMessage } from 'modules/client/messages';
import BBCode from 'components/BBCode';
import type { UserDocument } from 'modules/server/users';
import users, { getPublicUser } from 'modules/server/users';
import type { PublicUser } from 'modules/client/users';
import { uniqBy } from 'lodash';
import { useUserCache } from 'modules/client/UserCache';
import Link from 'components/Link';
import { Fragment } from 'react';
import Timestamp from 'components/Timestamp';
import Button from 'components/Button';
import BoxFooter from 'components/Box/BoxFooter';

type ServerSideProps = {
	message: ClientMessage,
	userCache: PublicUser[]
} | {
	statusCode: number
};

const Component = withErrorPage<ServerSideProps>(({ message, userCache: initialUserCache }) => {
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
						<Link href={`/u/${fromUser.id}`}>
							{fromUser.name}
						</Link>
					</div>
					<div id="message-to">
						{'To: '}
						{toUsers.map((toUser, index) => (
							<Fragment key={toUser.id}>
								{index !== 0 && ', '}
								<Link href={`/u/${toUser.id}`}>
									{toUser.name}
								</Link>
							</Fragment>
						))}
					</div>
					<div id="message-sent">
						<Timestamp relative withTime prefix="Sent ">
							{message.sent}
						</Timestamp>
						{message.edited && (
							<>
								{' ('}
								<Timestamp relative withTime prefix="Edited ">
									{message.edited}
								</Timestamp>
								)
							</>
						)}
					</div>
				</BoxSection>
				<BoxSection id="message-content">
					<BBCode>{message.content}</BBCode>
				</BoxSection>
				<BoxFooter>
					<Button>All Messages</Button>
					<Button>Reply</Button>
					<Button>Delete</Button>
				</BoxFooter>
			</Box>
		</Page>
	);
});

export default Component;

export const getServerSideProps = withStatusCode<ServerSideProps>(async ({ req, params }) => {
	const messageFromParams = await getMessageByUnsafeID(params.messageID);

	if (!messageFromParams) {
		return { props: { statusCode: 404 } };
	}

	if (!(
		req.user && (
			messageFromParams.from.equals(req.user._id)
			|| messageFromParams.to.some(userID => userID.equals(req.user!._id))
			|| req.user.perms & Perm.sudoRead
		)
	)) {
		return { props: { statusCode: 403 } };
	}

	const userCacheIDs = uniqBy([messageFromParams.from, ...messageFromParams.to], String);

	return {
		props: {
			message: getClientMessage(messageFromParams),
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