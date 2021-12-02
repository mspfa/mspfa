import './styles.module.scss';
import IconImage from 'components/IconImage';
import type { ClientMessage } from 'lib/client/messages';
import Link from 'components/Link';
import type { ChangeEvent, ReactNode } from 'react';
import { useMemo, useRef, useState } from 'react';
import useFunction from 'lib/client/reactHooks/useFunction';
import BBCode from 'components/BBCode';
import parseBBCode from 'lib/client/parseBBCode';
import { useUserCache } from 'lib/client/reactContexts/UserCache';
import Timestamp from 'components/Timestamp';
import { setUser, useUser } from 'lib/client/reactContexts/UserContext';
import api from 'lib/client/api';
import type { APIClient } from 'lib/client/api';
import Button from 'components/Button';
import RemoveButton from 'components/Button/RemoveButton';
import Dialog from 'lib/client/Dialog';
import useIsomorphicLayoutEffect from 'lib/client/reactHooks/useIsomorphicLayoutEffect';
import useLatest from 'lib/client/reactHooks/useLatest';
import ReplyButton from 'components/Button/ReplyButton';
import UserLink from 'components/Link/UserLink';
import InconspicuousDiv from 'components/InconspicuousDiv';
import { useRouter } from 'next/router';
import { addViewportListener, removeViewportListener } from 'lib/client/viewportListener';

type MessageReadByUserAPI = APIClient<typeof import('pages/api/messages/[messageID]/readBy/[userID]').default>;
type MessageDeletedByUserAPI = APIClient<typeof import('pages/api/messages/[messageID]/deletedBy/[userID]').default>;

export type ListedMessage = ClientMessage & {
	selected: boolean,
	/** Marks the message as read or unread with an API call. Only undefined until the message has rendered. */
	markRead?: (
		(
			/** `true` if should mark as read. `false` if should mark as unread. */
			read: boolean
		) => Promise<void>
	),
	/** Deletes the message with an API call. Only undefined until the message has rendered. */
	delete?: () => Promise<void>
};

export type MessageListingProps = {
	setMessage: (message: ListedMessage) => void,
	removeListing: (message: ListedMessage) => void,
	children: ListedMessage
};

const MessageListing = ({
	setMessage,
	removeListing,
	children: message
}: MessageListingProps) => {
	const user = useUser();
	const userRef = useLatest(user);

	/** The ID of the user whose messages are being viewed. */
	const queriedUserID = useRouter().query.userID as string;

	/** A ref to whether the authenticated user is viewing their own messages to avoid race conditions. */
	const userIsQueriedRef = useLatest(user!.id === queriedUserID);

	const { userCache } = useUserCache();
	const fromUser = userCache[message.from];

	const [open, setOpen] = useState(false);

	/** The first line of the message's content as plain text. */
	const partialContent = useMemo(() => {
		const plainContent = parseBBCode(message.content, { removeBBTags: true });

		const lineBreakIndex = plainContent.indexOf('\n');
		return (
			lineBreakIndex === -1
				? plainContent
				// Slice off everything after the first line.
				: plainContent.slice(0, lineBreakIndex)
		);
	}, [message.content]);
	const [fullContent, setFullContent] = useState<ReactNode>();

	// This state is whether the message's `partialContent` is not equal to its `fullContent`.
	const [moreLinkVisible, setMoreLinkVisible] = useState(false);
	const listingRef = useRef<HTMLDivElement>(null!);
	const contentRef = useRef<HTMLDivElement>(null!);

	// Set `fullContent`, and set `moreLinkVisible` based on whether the `fullContent` is one line of plain text.
	// This is a layout effect rather than a normal effect so the user can't see the component rendered with the wrong `moreLinkVisible` for a moment before the effect runs.
	useIsomorphicLayoutEffect(() => {
		const newFullContent = parseBBCode(message.content);
		setFullContent(newFullContent);

		// Check if the full content is not one line of plain text.
		if (partialContent !== newFullContent) {
			setMoreLinkVisible(true);
		}
	}, [message.content, partialContent]);

	// Set `moreLinkVisible` based on whether the message content's one line of plain text overflows its container on viewport change and on mount.
	// This is a layout effect rather than a normal effect for the same reason as the previous one.
	useIsomorphicLayoutEffect(() => {
		// Check that this message's content is one line of plain text.
		if (partialContent === fullContent) {
			const viewportListener = () => {
				if (open) {
					// Temporarily show less so the overflow detection can be accurate.
					listingRef.current.classList.remove('open');
				}

				setMoreLinkVisible(
					// Whether the message's content overflows its container.
					contentRef.current.scrollWidth > contentRef.current.offsetWidth
				);

				if (open) {
					// Restore the temporarily removed `open` class.
					listingRef.current.classList.add('open');
				}
			};

			viewportListener();
			const _viewportListener = addViewportListener(viewportListener);

			return () => {
				removeViewportListener(_viewportListener);
			};
		}
	}, [fullContent, partialContent, open]);

	// This state is whether no actions should be performed on the message due to it currently loading.
	const [loading, setLoading] = useState(false);

	message.markRead = useFunction(async (read: boolean) => {
		if (loading || message.read === read) {
			return;
		}

		setLoading(true);

		await (api as MessageReadByUserAPI).put(
			`/messages/${message.id}/readBy/${queriedUserID}`,
			read
		).finally(() => {
			setLoading(false);
		});

		setMessage({
			...message,
			read
		});

		if (userIsQueriedRef.current) {
			setUser({
				...userRef.current!,
				unreadMessageCount: userRef.current!.unreadMessageCount + (read ? -1 : 1)
			});
		}
	});

	message.delete = useFunction(async () => {
		if (loading) {
			return;
		}

		setLoading(true);

		await (api as MessageDeletedByUserAPI).put(
			`/messages/${message.id}/deletedBy/${queriedUserID}`,
			true
		).finally(() => {
			setLoading(false);
		});

		if (userIsQueriedRef.current && !message.read) {
			setUser({
				...userRef.current!,
				unreadMessageCount: userRef.current!.unreadMessageCount - 1
			});
		}

		removeListing(message);
	});

	const toggleRead = useFunction(() => {
		message.markRead!(!message.read);
	});

	const showMore = useFunction(() => {
		setOpen(true);
		message.markRead!(true);
	});

	const showLess = useFunction(() => {
		setOpen(false);
	});

	const confirmDeleteMessage = useFunction(async () => {
		if (loading || !await Dialog.confirm({
			id: 'delete-message',
			title: 'Delete Message',
			content: (
				<>
					Are you sure you want to delete this message?<br />
					<br />
					<i>{message.subject}</i><br />
					<br />
					The message will only be deleted for you. This cannot be undone.
				</>
			)
		})) {
			return;
		}

		message.delete!();
	});

	return (
		<div
			className={`listing${message.read ? ' read' : ''}${open ? ' open' : ''}`}
			ref={listingRef}
		>
			<label className="listing-selected-label" title="Select Message">
				<input
					type="checkbox"
					checked={message.selected}
					onChange={
						useFunction((event: ChangeEvent<HTMLInputElement>) => {
							setMessage({
								...message,
								selected: event.target.checked
							});
						})
					}
				/>
			</label>
			<Link
				className="listing-icon-container"
				href={`/messages/${message.id}`}
				title={message.subject}
			>
				<IconImage
					className="listing-icon"
					src={fromUser?.icon}
					alt={fromUser ? `${fromUser.name}'s Icon` : 'Deleted User\'s Icon'}
				/>
			</Link>
			<div className="listing-info">
				<Link
					className="listing-title translucent"
					href={`/messages/${message.id}`}
					title={message.subject}
				>
					{message.subject}
				</Link>
				<div className="listing-section listing-details">
					{'From '}
					<UserLink>{message.from}</UserLink>
					{' - '}
					<Timestamp
						relative
						withTime
						edited={message.edited}
					>
						{message.sent}
					</Timestamp>
				</div>
				<div
					className="listing-section listing-content"
					ref={contentRef}
				>
					<BBCode alreadyParsed>
						{open ? fullContent : partialContent}
					</BBCode>
				</div>
				{moreLinkVisible && (
					<InconspicuousDiv className="listing-section listing-footer">
						<Link
							className="listing-more-link"
							onClick={open ? showLess : showMore}
						>
							{open ? 'Show Less' : 'Show More'}
						</Link>
					</InconspicuousDiv>
				)}
			</div>
			<div className="listing-actions">
				<ReplyButton
					href={`/messages/new?replyTo=${message.id}`}
				/>
				<Button
					icon
					className={message.read ? 'mark-unread-button' : 'mark-read-button'}
					title={message.read ? 'Mark as Unread' : 'Mark as Read'}
					onClick={toggleRead}
				/>
				<RemoveButton
					title="Delete"
					onClick={confirmDeleteMessage}
				/>
			</div>
		</div>
	);
};

MessageListing.listClassName = 'message-list';

export default MessageListing;