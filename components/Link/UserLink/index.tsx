import type { LinkProps } from 'components/Link';
import Link from 'components/Link';
import { useUserCache } from 'lib/client/reactContexts/UserCache';

export type UserLinkProps = Omit<LinkProps, 'children' | 'href'> & {
	/** The ID of the user to link. */
	children: string
};

const UserLink = ({
	children: userID,
	...props
}: UserLinkProps) => {
	const { userCache } = useUserCache();

	return userCache[userID] ? (
		<Link
			href={`/users/${userID}`}
			{...props}
		>
			{userCache[userID]!.name}
		</Link>
	) : (
		<span
			title={`ID: ${userID}`}
			{...props}
		>
			(Deleted User)
		</span>
	);
};

export default UserLink;