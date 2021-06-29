import './styles.module.scss';
import IconImage from 'components/IconImage';
import type { ClientMessage } from 'modules/client/messages';
import Link from 'components/Link';
import type { ChangeEvent, MutableRefObject } from 'react';
import { useCallback, useMemo, useRef, useState } from 'react';
import BBCode, { sanitizeBBCode } from 'components/BBCode';
import { useUserCache } from 'modules/client/UserCache';
import Timestamp from 'components/Timestamp';
import { setUser, useUser } from 'modules/client/users';
import api from 'modules/client/api';
import type { APIClient, APIError } from 'modules/client/api';
import Button from 'components/Button';
import RemoveButton from 'components/Button/RemoveButton';
import { Dialog } from 'modules/client/dialogs';
import { useIsomorphicLayoutEffect, useLatest } from 'react-use';
import ReplyButton from 'components/Button/ReplyButton';
import UserLink from 'components/Link/UserLink';

type MessageReadByAPI = APIClient<typeof import('pages/api/messages/[messageID]/readBy').default>;
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

	/** A ref to whether the user is a sender or recipient of this message. */
	const userIsParticipantRef = useLatest(!!user && (
		message.from === user.id
		|| message.to.includes(user.id)
	));

	const { userCache } = useUserCache();
	const fromUser = userCache[message.from];

	const [open, setOpen] = useState(false);

	const plainContent = useMemo(() => {
		const fullPlainContent = sanitizeBBCode(message.content, { noBB: true });

		const lineBreakIndex = fullPlainContent.indexOf('\n');
		return (
			lineBreakIndex === -1
				? fullPlainContent
				// Slice off everything after the first line.
				: fullPlainContent.slice(0, lineBreakIndex)
		);
	}, [message.content]);
	const [richContent, setRichContent] = useState<string>();

	// This state is whether the message's content is rich, or whether it is not completely visible due to overflowing its container.
	const [moreLinkVisible, setMoreLinkVisible] = useState(false);
	const listingRef = useRef<HTMLDivElement>(null!);
	const contentRef = useRef<HTMLDivElement>(null!);

	useIsomorphicLayoutEffect(() => {
		const newRichContent = sanitizeBBCode(message.content);
		setRichContent(newRichContent);

		if (plainContent !== newRichContent) {
			setMoreLinkVisible(true);
		}

		// This ESLint comment is necessary because the rule incorrectly thinks `plainContent` should be a dependency here, despite that it depends on `message.content` which is already a dependency.
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [message.content]);

	useIsomorphicLayoutEffect(() => {
		if (
			// Check that this message's rich content has loaded via the previous effect hook.
			richContent !== undefined
			// Check that this message's content is plain text.
			&& plainContent === richContent
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
		// This ESLint comment is necessary because the rule incorrectly thinks `plainContent` should be a dependency here, despite that it depends on `message.content` which is already a dependency.
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [richContent, message.content, open]);

	// This state is whether no actions should be performed on the message due to it currently loading.
	const [loading, setLoading] = useState(false);

	message.ref = useRef({} as any);

	// We can use an empty object as the initial value of the above ref because the ref's value is then immediately set below.

	const { markRead } = message.ref.current = {
		markRead: useCallback(async read => {
			if (loading || !userIsParticipantRef.current || message.read === read) {
				return;
			}

			setLoading(true);

			const beforeInterceptError = (error: APIError) => {
				if (
					error.response && (
						(read && error.response.data.error === 'ALREADY_EXISTS')
					|| (!read && error.response.status === 404)
					)
				) {
					// The user already has the message marked as read or unread.

					error.preventDefault();
				}
			};

			const { data: { unreadMessageCount } } = await (
				read
					? (api as MessageReadByAPI).post(
						`/messages/${message.id}/readBy`,
						{ userID: user!.id },
						{ beforeInterceptError }
					)
					: (api as MessageReadByUserAPI).delete(
						`/messages/${message.id}/readBy/${user!.id}`,
						{ beforeInterceptError }
					)
			).catch((error: APIError) => {
				if (error.defaultPrevented) {
					return {
						data: {
							unreadMessageCount: (
								userRef.current
									? userRef.current.unreadMessageCount + (read ? -1 : 1)
									// If `!userRef.current`, this value should be completely unused. So I might as well set the `unreadMessageCount` to -1 so that a bug in which it isn't unused is more obvious to the user.
									: -1
							)
						}
					};
				}

				return Promise.reject(error);
			}).finally(() => {
				setLoading(false);
			});

			setMessageRef.current({
				...message,
				read
			});

			if (userIsParticipantRef.current as boolean) {
				setUser({
					...userRef.current!,
					unreadMessageCount
				});
			}
		}, [message, loading, setMessageRef, user, userIsParticipantRef, userRef]),
		deleteMessage: useCallback(async () => {
			if (loading || !userIsParticipantRef.current) {
				return;
			}

			setLoading(true);

			await (api as MessageDeletedByAPI).post(`/messages/${message.id}/deletedBy`, {
				userID: user!.id
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

			if (userIsParticipantRef.current as boolean && !message.read) {
				setUser({
					...userRef.current!,
					unreadMessageCount: userRef.current!.unreadMessageCount - 1
				});
			}

			removeListingRef.current(message);
		}, [loading, message, user, userRef, userIsParticipantRef, removeListingRef])
	};

	const toggleRead = useCallback(() => {
		markRead(!message.read);
	}, [markRead, message.read]);

	const showMore = useCallback(() => {
		setOpen(true);
		markRead(true);
	}, [markRead]);

	const showLess = useCallback(() => {
		setOpen(false);
	}, []);

	const confirmDeleteMessage = useCallback(async () => {
		if (loading || !(
			userIsParticipantRef.current
			&& await Dialog.confirm({
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
			})
		)) {
			return;
		}

		message.ref!.current.deleteMessage();
	}, [loading, message.subject, userIsParticipantRef, message.ref]);

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
						useCallback((event: ChangeEvent<HTMLInputElement>) => {
							setMessageRef.current({
								...message,
								selected: event.target.checked
							});
						}, [setMessageRef, message])
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
					alt={fromUser && `${fromUser.name}'s Icon`}
				/>
			</Link>
			<div className="listing-info">
				<Link
					className="listing-title translucent-text"
					href={`/message/${message.id}`}
					title={message.subject}
				>
					{message.subject}
				</Link>
				<div className="listing-section listing-info">
					{'From '}
					<UserLink>{message.from}</UserLink>
					{' - '}
					<Timestamp
						relative
						edited={message.edited}
					>
						{message.sent}
					</Timestamp>
				</div>
				<div
					className="listing-section listing-content"
					ref={contentRef}
				>
					<BBCode>
						{open ? richContent : plainContent}
					</BBCode>
				</div>
				{moreLinkVisible && (
					<div className="listing-section listing-footer">
						<Link
							className="listing-more-link"
							onClick={open ? showLess : showMore}
						>
							{open ? 'Show Less' : 'Show More'}
						</Link>
					</div>
				)}
			</div>
			{userIsParticipantRef.current && (
				<div className="listing-actions">
					<ReplyButton
						href={`/message/new?replyTo=${message.id}`}
					/>
					<Button
						className={`icon${message.read ? ' mark-unread' : ' mark-read'}`}
						title={message.read ? 'Mark as Unread' : 'Mark as Read'}
						onClick={toggleRead}
					/>
					<RemoveButton
						title="Delete"
						onClick={confirmDeleteMessage}
					/>
				</div>
			)}
		</div>
	);
};

MessageListing.listClassName = 'message-list';

export default MessageListing;