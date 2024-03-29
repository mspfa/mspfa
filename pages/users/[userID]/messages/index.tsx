import './styles.module.scss';
import Page from 'components/Page';
import { withErrorPage } from 'lib/client/errors';
import withStatusCode from 'lib/server/withStatusCode';
import Section from 'components/Section';
import Perm from 'lib/client/Perm';
import { permToGetUserInPage } from 'lib/server/users/permToGetUser';
import type { ServerMessage } from 'lib/server/messages';
import messages, { getClientMessage } from 'lib/server/messages';
import type { ClientMessage } from 'lib/client/messages';
import type { PublicUser, PrivateUser } from 'lib/client/users';
import { useUser } from 'lib/client/reactContexts/UserContext';
import { useUserCache } from 'lib/client/reactContexts/UserCache';
import List from 'components/List';
import { uniqBy } from 'lodash';
import users, { getPrivateUser, getPublicUser } from 'lib/server/users';
import type { ListedMessage } from 'components/MessageListing';
import MessageListing from 'components/MessageListing';
import { useEffect, useRef } from 'react';
import useFunction from 'lib/client/reactHooks/useFunction';
import Button from 'components/Button';
import Dialog from 'components/Dialog';
import RandomArtwork from 'components/RandomArtwork';
import type { integer } from 'lib/types';
import useSticky from 'lib/client/reactHooks/useSticky';
import getRandomImageFilename from 'lib/server/getRandomImageFilename';
import { useImmer } from 'use-immer';
import useLatest from 'lib/client/reactHooks/useLatest';

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
	const [user, setUser] = useUser<true>();
	const userRef = useLatest(user);

	const [listedMessages, updateListedMessages] = useImmer(() => (
		clientMessages.map<ListedMessage>(message => ({
			...message,
			selected: false
		}))
	));

	const { cacheUser } = useUserCache();
	initialUserCache.forEach(cacheUser);

	/** A ref to the `#messages-actions` element. */
	const messagesActionsElementRef = useRef<HTMLDivElement>(null as never);
	useSticky(messagesActionsElementRef);

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
		if (
			userRef.current.id === privateUser.id
			&& userRef.current.unreadMessageCount !== unreadCount
		) {
			// Update the user's unread message count since it is outdated.
			setUser({
				...userRef.current,
				unreadMessageCount: unreadCount
			});
		}
	}, [unreadCount, privateUser.id, setUser, userRef]);

	const deselectAll = useFunction(() => {
		updateListedMessages(listedMessages => {
			for (const message of listedMessages) {
				message.selected = false;
			}
		});
	});

	const selectAll = useFunction(() => {
		updateListedMessages(listedMessages => {
			for (const message of listedMessages) {
				message.selected = true;
			}
		});
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
		if (!await Dialog.confirm(
			<Dialog id="delete-messages" title="Delete Messages">
				Are you sure you want to delete all selected messages ({selectedCount})?<br />
				<br />
				The messages will only be deleted for you. This cannot be undone.
			</Dialog>
		)) {
			return;
		}

		for (const message of listedMessages) {
			if (message.selected) {
				message.delete!();
			}
		}
	});

	const setMessage = useFunction((message: ListedMessage) => {
		updateListedMessages(listedMessages => {
			const messageIndex = listedMessages.findIndex(({ id }) => id === message.id);

			listedMessages[messageIndex] = message;
		});
	});

	const removeListing = useFunction((message: ListedMessage) => {
		updateListedMessages(listedMessages => {
			const messageIndex = listedMessages.findIndex(({ id }) => id === message.id);

			listedMessages.splice(messageIndex, 1);
		});
	});

	return (
		<Page withFlashyTitle heading="Messages">
			<Section
				heading={`Your Messages (${listedMessages.length} total, ${unreadCount} unread)`}
			>
				<div
					id="messages-actions"
					ref={messagesActionsElementRef}
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
	const { user, statusCode } = await permToGetUserInPage(req, params.userID, Perm.READ);

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
