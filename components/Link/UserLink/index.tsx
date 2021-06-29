import type { LinkProps } from 'components/Link';
import Link from 'components/Link';
import { useUserCache } from 'modules/client/UserCache';
import { useState } from 'react';
import { useIsomorphicLayoutEffect, useLatest } from 'react-use';

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

	const [lastUserID, setLastUserID] = useState<string>();
	const userIDRef = useLatest(userID);

	useIsomorphicLayoutEffect(() => {
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
	}, [fetchAndCacheUser, lastUserID, userCache, userID, userIDRef]);

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
			{userID in userCache ? '[Deleted User]' : '[Loading...]'}
		</span>
	);
};

export default UserLink;