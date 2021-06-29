import type { LinkProps } from 'components/Link';
import Link from 'components/Link';
import { useUserCache } from 'modules/client/UserCache';
import { useState } from 'react';
import { useLatest } from 'react-use';

export type UserLinkProps = Omit<LinkProps, 'children' | 'href'> & {
	/** The ID of the user to link. */
	children: string
};

const UserLink = ({
	children: userID,
	...props
}: UserLinkProps) => {
	const { userCache, fetchAndCacheUser } = useUserCache();
	const [, updateUserCache] = useState(false);

	const [lastUserID, setLastUserID] = useState(userID);
	const userIDRef = useLatest(userID);

	if (lastUserID !== userID) {
		setLastUserID(userID);

		if (!(userID in userCache)) {
			fetchAndCacheUser(userID).then(() => {
				if (userID === userIDRef.current) {
					updateUserCache(value => !value);
				}
			});
		}
	}

	return userCache[userID] ? (
		<Link
			href={`/user/${userID}`}
			{...props}
		>
			{userCache[userID]!.name}
		</Link>
	) : (
		<span
			title={`ID: ${userID}`}
			{...props}
		>
			{userID in userCache ? '[Loading...]' : '[User Not Found]'}
		</span>
	);
};

export default UserLink;