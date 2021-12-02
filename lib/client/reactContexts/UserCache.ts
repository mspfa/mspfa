import type { PublicUser } from 'lib/client/users';
import React, { useContext } from 'react';
import useFunction from 'lib/client/reactHooks/useFunction';

const UserCache = React.createContext<Partial<Record<string, PublicUser>>>(undefined!);

export default UserCache;

/**
 * Uses the user cache React context, and provides functions to manage the user cache.
 *
 * This hook should never cause any component updates, as the value of the user cache context should never be changed, only mutated.
 */
export const useUserCache = () => {
	const userCache = useContext(UserCache);

	/** Sets a `PublicUser` into the user cache. */
	const cacheUser = useFunction((user: PublicUser) => {
		userCache[user.id] = user;
	});

	return { userCache, cacheUser };
};