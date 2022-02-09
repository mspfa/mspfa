import './styles.module.scss';
import Page from 'components/Page';
import { withErrorPage } from 'lib/client/errors';
import withStatusCode from 'lib/server/withStatusCode';
import Section from 'components/Section';
import { Perm } from 'lib/client/perms';
import { permToGetUserInPage } from 'lib/server/users/permToGetUser';
import type { ServerMessage } from 'lib/server/messages';
import messages, { getClientMessage } from 'lib/server/messages';
import type { ClientMessage } from 'lib/client/messages';
import type { PublicUser, PrivateUser } from 'lib/client/users';
import { getUser, setUser } from 'lib/client/reactContexts/UserContext';
import { useUserCache } from 'lib/client/reactContexts/UserCache';
import List from 'components/List';
import { uniqBy } from 'lodash';
import users, { getPrivateUser, getPublicUser } from 'lib/server/users';
import type { ListedMessage } from 'components/MessageListing';
import MessageListing from 'components/MessageListing';
import { useEffect, useRef, useState } from 'react';
import useFunction from 'lib/client/reactHooks/useFunction';
import Button from 'components/Button';
import Dialog from 'lib/client/Dialog';
import RandomArtwork from 'components/RandomArtwork';
import type { integer } from 'lib/types';
import useSticky from 'lib/client/reactHooks/useSticky';
import getRandomImageFilename from 'lib/server/getRandomImageFilename';

type ServerSideProps = {
	privateUser: PrivateUser,
	clientMessages: ClientMessage[],
	userCache: PublicUser[],
	imageFilename: string
} | {
	statusCode: integer
};

const Component = withErrorPage<ServerSideProps>(({
	privateUser,
	clientMessages,
	userCache: initialUserCache,
	imageFilename
}) => {
	const [listedMessages, setListedMessages] = useState(() => (
		clientMessages.map<ListedMessage>(message => ({
			...message,
			selected: false
		}))
	));

	const { cacheUser } = useUserCache();
	initialUserCache.forEach(cacheUser);

	/** A ref to the `#messages-actions` element. */
	const pagesActionsElementRef = useRef<HTMLDivElement>(null!);
	useSticky(pagesActionsElementRef);

	let selectedCount = 0;
	let unreadCount = 0;

	for (const message of listedMessages) {
		if (message.selected) {
			selectedCount++;
		}

		if (!message.read) {
			unreadCount++;
		}
	}

	useEffect(() => {
		const user = getUser();

		if (user?.id === privateUser.id) {
			// Update the user's unread message count in case it is outdated.
			setUser({
				...user,
				unreadMessageCount: unreadCount
			});
		}
	}, [unreadCount, privateUser.id]);

	const deselectAll = useFunction(() => {
		setListedMessages(listedMessages.map(message => ({
			...message,
			selected: false
		})));
	});

	const selectAll = useFunction(() => {
		setListedMessages(listedMessages.map(message => ({
			...message,
			selected: true
		})));
	});

	const markRead = useFunction(() => {
		for (const message of listedMessages) {
			if (message.selected) {
				message.markRead!(true);
			}
		}
	});

	const markUnread = useFunction(() => {
		for (const message of listedMessages) {
			if (message.selected) {
				message.markRead!(false);
			}
		}
	});

	const deleteMessages = useFunction(async () => {
		if (!await Dialog.confirm({
			id: 'delete-messages',
			title: 'Delete Messages',
			content: `Are you sure you want to delete all selected messages (${selectedCount})?\n\nThe messages will only be deleted for you. This cannot be undone.`
		})) {
			return;
		}

		for (const message of listedMessages) {
			if (message.selected) {
				message.delete!();
			}
		}
	});

	const setMessage = useFunction((message: ListedMessage) => {
		const messageIndex = listedMessages.findIndex(({ id }) => id === message.id);

		setListedMessages([
			...listedMessages.slice(0, messageIndex),
			message,
			...listedMessages.slice(messageIndex + 1, listedMessages.length)
		]);
	});

	const removeListing = useFunction((message: ListedMessage) => {
		const messageIndex = listedMessages.findIndex(({ id }) => id === message.id);

		setListedMessages([
			...listedMessages.slice(0, messageIndex),
			...listedMessages.slice(messageIndex + 1, listedMessages.length)
		]);
	});

	return (
		<Page withFlashyTitle heading="Messages">
			<Section
				heading={`Your Messages (${listedMessages.length} total, ${unreadCount} unread)`}
			>
				<div
					id="messages-actions"
					ref={pagesActionsElementRef}
				>
					<Button
						className="small"
						href="/messages/new"
						title="New Message"
					>
						New Message
					</Button>
					{listedMessages.length !== 0 && (
						<>
							<Button
								className="small"
								title={
									selectedCount
										? `Deselect Selected Messages (${selectedCount})`
										: `Select All Messages (${listedMessages.length})`
								}
								onClick={selectedCount ? deselectAll : selectAll}
							>
								{selectedCount ? 'Deselect All' : 'Select All'}
							</Button>
							{selectedCount !== 0 && (
								<>
									<Button
										className="small"
										title={`Mark Selected Messages as Read (${selectedCount})`}
										onClick={markRead}
									>
										Mark as Read
									</Button>
									<Button
										className="small"
										title={`Mark Selected Messages as Unread (${selectedCount})`}
										onClick={markUnread}
									>
										Mark as Unread
									</Button>
									<Button
										className="small"
										title={`Delete Selected Messages (${selectedCount})`}
										onClick={deleteMessages}
									>
										Delete
									</Button>
								</>
							)}
						</>
					)}
				</div>
				{listedMessages.length === 0 ? (
					<RandomArtwork
						directory="no-messages"
						name="No Messages"
						imageFilename={imageFilename}
					>
						No new messages.
					</RandomArtwork>
				) : (
					<List
						listing={MessageListing}
						setMessage={setMessage}
						removeListing={removeListing}
					>
						{listedMessages}
					</List>
				)}
			</Section>
		</Page>
	);
});

export default Component;

export const getServerSideProps = withStatusCode<ServerSideProps>(async ({ req, params }) => {
	const { user, statusCode } = await permToGetUserInPage(req, params.userID, Perm.sudoRead);

	if (statusCode) {
		return { props: { statusCode } };
	}

	const serverMessages = await messages.aggregate!<ServerMessage>([
		// Find messages sent to this user.
		{ $match: { notDeletedBy: user!._id } },
		// Sort by newest first.
		{ $sort: { sent: -1 } }
	]).toArray();

	const clientMessages = serverMessages.map(message => getClientMessage(message, user!));

	return {
		props: {
			privateUser: getPrivateUser(user!),
			clientMessages,
			userCache: (
				await users.find!({
					_id: {
						$in: uniqBy(serverMessages.map(message => message.from), String)
					},
					willDelete: { $exists: false }
				}).map(getPublicUser).toArray()
			),
			imageFilename: await getRandomImageFilename('public/images/no-messages')
		}
	};
});