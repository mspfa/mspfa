import './styles.module.scss';
import IconImage from 'components/IconImage';
import type { ClientMessage } from 'modules/client/messages';
import Link from 'components/Link';
import { Fragment, useCallback, useState } from 'react';
import BBCode from 'components/BBCode';
import { useUserCache } from 'modules/client/UserCache';
import Timestamp from 'components/Timestamp';

export type MessageListingProps = {
	children: ClientMessage
};

const MessageListing = ({ children: message }: MessageListingProps) => {
	const [open, setOpen] = useState(false);

	const toggleOpen = useCallback(() => {
		setOpen(open => !open);
	}, []);

	const { userCache } = useUserCache();
	const fromUser = userCache[message.from]!;

	const className = (
		(message.read ? ' read-message' : '')
		+ (open ? ' open' : '')
	);

	return (
		<>
			<Link href={`/message/${message.id}`}>
				<IconImage
					className={`listing-icon${className}`}
					src={fromUser.icon}
					title={`${fromUser.name}'s Icon`}
				/>
			</Link>
			<div className={`listing-info${className}`}>
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
					<Timestamp relative>{message.sent}</Timestamp>
				</div>
				{open && (
					<div className="listing-section listing-content">
						<BBCode>{message.content}</BBCode>
					</div>
				)}
				<div className="listing-section listing-footer">
					<Link
						className="listing-preview-link"
						onClick={toggleOpen}
					>
						{open ? 'Hide Preview' : 'Show Preview'}
					</Link>
				</div>
			</div>
		</>
	);
};

export default MessageListing;