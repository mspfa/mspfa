import type { PublicUser } from 'modules/client/users';
import React, { useContext } from 'react';
import type { APIClient } from 'modules/client/api';
import api from 'modules/client/api';

type UserAPI = APIClient<typeof import('pages/api/users/[userID]').default>;

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
	const cacheUser = (user: PublicUser) => {
		userCache[user.id] = user;
	};

	/** Returns a `PublicUser` from the user cache by ID, or fetches and caches it before returning it if it isn't already cached. */
	const fetchAndCacheUser = (userID: string) => (
		(api as UserAPI).get(`/users/${userID}`).then(({ data: publicUser }) => {
			userCache[userID] = publicUser;
		})
	);

	return { userCache, cacheUser, fetchAndCacheUser };
};