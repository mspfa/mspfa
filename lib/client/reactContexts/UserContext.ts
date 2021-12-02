import type { Dispatch, SetStateAction } from 'react';
import React, { useContext, useState } from 'react';
import type { RecursivePartial } from 'lib/types';
import type { PrivateUser } from 'lib/client/users';
import createGlobalState from 'global-react-state';

// Using a React context is necessary here so the user data can be safely used server-side.
const UserContext = React.createContext<PrivateUser | undefined>(undefined);

export default UserContext;

/**
 * Re-renders the component when the current authenticated user changes (or signs in/out).
 *
 * Returns the current authenticated user.
 *
 * ⚠️ Avoid using this for client-only purposes if the component does not need to be updated when the user state changes. Use `getUser` instead.
 */
export const useUser = () => useContext(UserContext);

let globalUserState: PrivateUser | undefined;
let globalSetUserState: Dispatch<SetStateAction<PrivateUser | undefined>> | undefined;

/**
 * Gets the current authenticated user.
 *
 * ⚠️ Calling this server-side leads to race conditions for which user is currently set in the global state. Unless this is being called in client-only code, use `useUser` instead.
 */
export const getUser = () => globalUserState;

/** Sets the current authenticated user and re-renders all components using it. */
export const setUser = (user: PrivateUser | undefined) => {
	if (globalSetUserState) {
		globalSetUserState(user);
	}
};

/**
 * Similar to `useUser` but without the React context middleman and allows passing the initial user state.
 *
 * ⚠️ This should only be used in `pages/_app`. Please use `useUser` instead because it allows for server-side rendering via React context, and it allows for user modifications passed into the context's value from `pages/_app`.
 */
export const useUserInApp = (initialUserState: PrivateUser | undefined) => {
	[globalUserState, globalSetUserState] = useState(initialUserState);

	return globalUserState;
};

export const [useUserMerge, setUserMerge, getUserMerge] = createGlobalState<RecursivePartial<PrivateUser | undefined>>(undefined);