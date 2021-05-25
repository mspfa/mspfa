import Page from 'components/Page';
import { withErrorPage } from 'modules/client/errors';
import { withStatusCode } from 'modules/server/errors';
import Box from 'components/Box';
import BoxSection from 'components/Box/BoxSection';
import { Perm } from 'modules/client/perms';
import { permToGetUserInPage } from 'modules/server/perms';
import messages, { getClientMessage } from 'modules/server/messages';
import type { ClientMessage } from 'modules/client/messages';
import type { PublicUser } from 'modules/client/users';
import { useUserCache } from 'modules/client/UserCache';
import List from 'components/List';
import { uniqBy } from 'lodash';
import type { UserDocument } from 'modules/server/users';
import users, { getPublicUser } from 'modules/server/users';
import MessageListing from 'components/MessageListing';

type ServerSideProps = {
	clientMessages: ClientMessage[],
	userCache: PublicUser[]
} | {
	statusCode: number
};

const Component = withErrorPage<ServerSideProps>(({ clientMessages, userCache: initialUserCache }) => {
	const { cacheUser } = useUserCache();
	initialUserCache.forEach(cacheUser);

	return (
		<Page flashyTitle heading="Messages">
			<Box>
				<BoxSection heading="Your Messages">
					<List listing={MessageListing}>
						{clientMessages}
					</List>
				</BoxSection>
			</Box>
		</Page>
	);
});

export default Component;

export const getServerSideProps = withStatusCode<ServerSideProps>(async ({ req, params }) => {
	const { user, statusCode } = await permToGetUserInPage(req, params.userID, Perm.sudoRead);

	if (statusCode) {
		return { props: { statusCode } };
	}

	const serverMessages = await messages.find!({
		notDeletedBy: user!._id
	}).toArray();

	const clientMessages = serverMessages.map(message => getClientMessage(message, user!));

	return {
		props: {
			clientMessages,
			userCache: (
				// All of the `PublicUser`s from the user IDs in each message's `from` property.
				(
					(await Promise.all(
						uniqBy(serverMessages.map(message => message.from), String).map(
							userID => users.findOne({ _id: userID })
						)
					)).filter(Boolean) as UserDocument[]
				).map(getPublicUser)
			)
		}
	};
});