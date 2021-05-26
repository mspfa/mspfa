import './styles.module.scss';
import IconImage from 'components/IconImage';
import type { ClientMessage } from 'modules/client/messages';
import Link from 'components/Link';
import { useCallback, useEffect, useRef, useState } from 'react';
import BBCode, { sanitizeBBCode } from 'components/BBCode';
import { useUserCache } from 'modules/client/UserCache';
import Timestamp from 'components/Timestamp';
import { getUser, setUser } from 'modules/client/users';
import api from 'modules/client/api';
import type { APIClient } from 'modules/client/api';

type MessageReadByAPI = APIClient<typeof import('pages/api/messages/[messageID]/readBy').default>;

export type MessageListingProps = {
	children: ClientMessage
};

const MessageListing = ({ children: messageProp }: MessageListingProps) => {
	const [message, setMessage] = useState(messageProp);

	const { userCache } = useUserCache();
	const fromUser = userCache[message.from]!;

	const [open, setOpen] = useState(false);

	const showMore = useCallback(async () => {
		setOpen(true);

		if (!message.read) {
			// The user is opening the unread message.

			const user = getUser();

			if (user && message.to.includes(user.id)) {
				// The user is a recipient of this message.

				const markMessageAsRead = () => {
					setMessage(message => ({
						...message,
						read: true
					}));
				};

				const { data: { unreadMessageCount } } = await (api as MessageReadByAPI).post(`/messages/${message.id}/readBy`, {
					userID: user.id
				}, {
					beforeInterceptError: error => {
						if (error.response?.data.error === 'ALREADY_EXISTS') {
							// The user already has the message marked as read.

							error.preventDefault();

							markMessageAsRead();

							setUser({
								...user,
								unreadMessageCount: user.unreadMessageCount - 1
							});
						}
					}
				});

				markMessageAsRead();

				setUser({
					...user,
					unreadMessageCount
				});
			}
		}
	}, [message.id, message.to, message.read]);

	const showLess = useCallback(() => {
		setOpen(false);
	}, []);

	const [plainContent] = useState(() => sanitizeBBCode(message.content, { noBB: true }));
	const [richContent] = useState(plainContent);

	const contentRef = useRef<HTMLDivElement>(null!);
	// This state is whether the message's content is rich, or whether it not completely visible due to overflowing its container.
	const [moreLinkVisible, setMoreLinkVisible] = useState(false);

	useEffect(() => {
		if (!moreLinkVisible) {
			// Whether the message's content overflows its container.
			let newMoreLinkVisible = contentRef.current.scrollWidth > contentRef.current.offsetWidth;

			if (!newMoreLinkVisible) {
				const richContent = sanitizeBBCode(message.content);

				// Whether the message's content is rich.
				newMoreLinkVisible = plainContent !== richContent;
			}

			setMoreLinkVisible(newMoreLinkVisible);
		}
	}, [moreLinkVisible, message.content, plainContent]);

	return (
		<div className={`listing${message.read ? ' read' : ''}${open ? ' open' : ''}`}>
			<Link
				className="listing-icon"
				href={`/message/${message.id}`}
				title={message.subject}
			>
				<IconImage
					src={fromUser.icon}
					alt={`${fromUser.name}'s Icon`}
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
				<div className="listing-section listing-meta">
					{'From '}
					<Link href={`/user/${fromUser.id}`}>
						{fromUser.name}
					</Link>
					{' - '}
					<Timestamp relative>
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
		</div>
	);
};

MessageListing.listClassName = 'message-list';

export default MessageListing;