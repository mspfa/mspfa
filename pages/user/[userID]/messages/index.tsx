import './styles.module.scss';
import Page from 'components/Page';
import { withErrorPage } from 'modules/client/errors';
import { withStatusCode } from 'modules/server/errors';
import Box from 'components/Box';
import BoxSection from 'components/Box/BoxSection';
import { Perm } from 'modules/client/perms';
import { permToGetUserInPage } from 'modules/server/perms';
import messages, { getClientMessage } from 'modules/server/messages';
import type { ClientMessage } from 'modules/client/messages';
import type { PublicUser, PrivateUser } from 'modules/client/users';
import { getUser, setUser } from 'modules/client/users';
import { useUserCache } from 'modules/client/UserCache';
import List from 'components/List';
import { uniqBy } from 'lodash';
import users, { getPrivateUser, getPublicUser } from 'modules/server/users';
import type { ListedMessage } from 'components/MessageListing';
import MessageListing from 'components/MessageListing';
import { useCallback, useEffect, useState } from 'react';
import Button from 'components/Button';
import { useLatest } from 'react-use';
import { Dialog } from 'modules/client/dialogs';
import fs from 'fs-extra';
import path from 'path';
import Row from 'components/Row';

type ServerSideProps = {
	privateUser: PrivateUser,
	clientMessages: ClientMessage[],
	userCache: PublicUser[],
	imageFilename: string
} | {
	statusCode: number
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

	const deselectAll = useCallback(() => {
		setListedMessages(listedMessages.map(message => ({
			...message,
			selected: false
		})));
	}, [listedMessages]);

	const selectAll = useCallback(() => {
		setListedMessages(listedMessages.map(message => ({
			...message,
			selected: true
		})));
	}, [listedMessages]);

	const markRead = useCallback(() => {
		for (const message of listedMessages) {
			if (message.selected) {
				message.ref!.current.markRead(true);
			}
		}
	}, [listedMessages]);

	const markUnread = useCallback(() => {
		for (const message of listedMessages) {
			if (message.selected) {
				message.ref!.current.markRead(false);
			}
		}
	}, [listedMessages]);

	const deleteMessages = useCallback(async () => {
		if (!await Dialog.confirm({
			id: 'delete-messages',
			title: 'Delete Messages',
			content: `Are you sure you want to delete all selected messages (${selectedCount})?\n\nThe messages will only be deleted for you. This cannot be undone.`
		})) {
			return;
		}

		for (const message of listedMessages) {
			if (message.selected) {
				message.ref!.current.deleteMessage();
			}
		}
	}, [listedMessages, selectedCount]);

	// It is necessary that `setMessage` and `removeListing` are refs to fix race conditions due to running them on multiple selected messages simultaneously.
	const setMessageRef = useLatest(
		useCallback((message: ListedMessage) => {
			const messageIndex = listedMessages.findIndex(({ id }) => id === message.id);

			setListedMessages([
				...listedMessages.slice(0, messageIndex),
				message,
				...listedMessages.slice(messageIndex + 1, listedMessages.length)
			]);
		}, [listedMessages])
	);

	const removeListingRef = useLatest(
		useCallback((message: ListedMessage) => {
			const messageIndex = listedMessages.findIndex(({ id }) => id === message.id);

			setListedMessages([
				...listedMessages.slice(0, messageIndex),
				...listedMessages.slice(messageIndex + 1, listedMessages.length)
			]);
		}, [listedMessages])
	);

	return (
		<Page flashyTitle heading="Messages">
			<Box>
				<BoxSection
					heading={`Your Messages (${listedMessages.length} total, ${unreadCount} unread)`}
				>
					<div id="messages-actions">
						<Button
							className="small"
							href="/message/new"
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
						<div id="no-messages">
							<Row>
								<img
									src={`/images/no-messages/${imageFilename}`}
									width={400}
									height={250}
									alt="Artwork for No Messages"
									title={`Artist: ${imageFilename.slice(0, imageFilename.indexOf('.'))}`}
								/>
							</Row>
							<Row>No new messages.</Row>
						</div>
					) : (
						<List
							listing={MessageListing}
							setMessageRef={setMessageRef}
							removeListingRef={removeListingRef}
						>
							{listedMessages}
						</List>
					)}
				</BoxSection>
			</Box>
		</Page>
	);
});

export default Component;

// @server-only {
const imageFilenames = (
	fs.readdirSync(
		path.join(process.cwd(), 'public/images/no-messages')
	)
).filter(filename => /\.(?:png|gif)$/i.test(filename));
// @server-only }

export const getServerSideProps = withStatusCode<ServerSideProps>(async ({ req, params }) => {
	const { user, statusCode } = await permToGetUserInPage(req, params.userID, Perm.sudoRead);

	if (statusCode) {
		return { props: { statusCode } };
	}

	const serverMessages = await messages.aggregate!([
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
			imageFilename: imageFilenames[Math.floor(Math.random() * imageFilenames.length)]
		}
	};
});