import './styles.module.scss';
import IconImage from 'components/IconImage';
import type { ClientMessage } from 'lib/client/messages';
import Link from 'components/Link';
import type { ChangeEvent, MutableRefObject, ReactNode } from 'react';
import { useMemo, useRef, useState } from 'react';
import useFunction from 'lib/client/useFunction';
import BBCode from 'components/BBCode';
import parseBBCode from 'lib/client/parseBBCode';
import { useUserCache } from 'lib/client/UserCache';
import Timestamp from 'components/Timestamp';
import { setUser, useUser } from 'lib/client/users';
import api from 'lib/client/api';
import type { APIClient, APIError } from 'lib/client/api';
import Button from 'components/Button';
import RemoveButton from 'components/Button/RemoveButton';
import Dialog from 'lib/client/Dialog';
import { useIsomorphicLayoutEffect, useLatest } from 'react-use';
import ReplyButton from 'components/Button/ReplyButton';
import UserLink from 'components/Link/UserLink';
import InconspicuousDiv from 'components/InconspicuousDiv';
import { useRouter } from 'next/router';

type MessageReadByUserAPI = APIClient<typeof import('pages/api/messages/[messageID]/readBy/[userID]').default>;
type MessageDeletedByAPI = APIClient<typeof import('pages/api/messages/[messageID]/deletedBy').default>;

export type ListedMessage = ClientMessage & {
	selected: boolean,
	/** A ref with methods relating to the message. Only undefined until the message has rendered. */
	ref?: MutableRefObject<{
		markRead: (
			(
				/** `true` if should mark as read. `false` if should mark as unread. */
				read: boolean
			) => Promise<void>
		),
		deleteMessage: () => Promise<void>
	}>
};

export type MessageListingProps = {
	setMessageRef: MutableRefObject<(message: ListedMessage) => void>,
	removeListingRef: MutableRefObject<(message: ListedMessage) => void>,
	children: ListedMessage
};

const MessageListing = ({
	setMessageRef,
	removeListingRef,
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

	useIsomorphicLayoutEffect(() => {
		const newFullContent = parseBBCode(message.content);
		setFullContent(newFullContent);

		if (partialContent !== newFullContent) {
			setMoreLinkVisible(true);
		}
	}, [message.content, partialContent]);

	useIsomorphicLayoutEffect(() => {
		if (
			// Check that this message's rich content has loaded via the previous effect hook.
			fullContent !== undefined
			// Check that this message's content is plain text.
			&& partialContent === fullContent
		) {
			const onResize = () => {
				if (open) {
					// Temporarily show less so the overflow detection can be accurate.
					listingRef.current.className = listingRef.current.className.replace(/(?:^| )open( |$)/, '$1');
				}

				setMoreLinkVisible(
					// Whether the message's content overflows its container.
					contentRef.current.scrollWidth > contentRef.current.offsetWidth
				);

				if (open) {
					listingRef.current.className += ' open';
				}
			};

			onResize();
			window.addEventListener('resize', onResize);

			return () => {
				window.removeEventListener('resize', onResize);
			};
		}

		// `message.content` should be a dependency here because the widths of `contentRef.current` depend on it and are referenced in this hook.
		// This ESLint comment is necessary because the rule incorrectly thinks `partialContent` should be a dependency here, despite that it depends on `message.content` which is already a dependency.
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [fullContent, message.content, open]);

	// This state is whether no actions should be performed on the message due to it currently loading.
	const [loading, setLoading] = useState(false);

	message.ref = useRef({} as any);

	// We can use an empty object as the initial value of the above ref because the ref's value is then immediately set below.

	const { markRead } = message.ref.current = {
		markRead: useFunction(async read => {
			if (loading || message.read === read) {
				return;
			}

			setLoading(true);

			const { data: { unreadMessageCount } } = await (api as MessageReadByUserAPI).put(
				`/messages/${message.id}/readBy/${queriedUserID}`,
				read
			).finally(() => {
				setLoading(false);
			});

			setMessageRef.current({
				...message,
				read
			});

			if (userIsQueriedRef.current) {
				setUser({
					...userRef.current!,
					unreadMessageCount
				});
			}
		}),
		deleteMessage: useFunction(async () => {
			if (loading) {
				return;
			}

			setLoading(true);

			await (api as MessageDeletedByAPI).post(`/messages/${message.id}/deletedBy`, {
				userID: queriedUserID
			}, {
				beforeInterceptError: error => {
					if (error.response?.status === 422) {
						// The user isn't able to delete the message, so the message might as well be deleted.

						error.preventDefault();
					}
				}
			}).catch((error: APIError) => {
				if (!error.defaultPrevented) {
					setLoading(false);

					return Promise.reject(error);
				}
			});

			if (userIsQueriedRef.current && !message.read) {
				setUser({
					...userRef.current!,
					unreadMessageCount: userRef.current!.unreadMessageCount - 1
				});
			}

			removeListingRef.current(message);
		})
	};

	const toggleRead = useFunction(() => {
		markRead(!message.read);
	});

	const showMore = useFunction(() => {
		setOpen(true);
		markRead(true);
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

		message.ref!.current.deleteMessage();
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
							setMessageRef.current({
								...message,
								selected: event.target.checked
							});
						})
					}
				/>
			</label>
			<Link
				className="listing-icon-container"
				href={`/message/${message.id}`}
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
					href={`/message/${message.id}`}
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
					href={`/message/new?replyTo=${message.id}`}
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