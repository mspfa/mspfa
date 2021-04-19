import type { UserDocument } from 'modules/server/users';
import React, { useContext, useState } from 'react';
import api from 'modules/client/api';
import type { APIClient } from 'modules/client/api';
import { startLoading, stopLoading } from 'components/LoadingIndicator';
import { Dialog } from 'modules/client/dialogs';
import createGlobalState from 'global-react-state';
import type { RecursivePartial } from 'modules/types';

/** All keys whose values have the same serializable type in both `DocumentUser` and `PrivateUser`. */
type PrivateUserDocumentKey = 'name' | 'email' | 'unverifiedEmail' | 'description' | 'icon' | 'site' | 'storySaves' | 'achievements' | 'favs' | 'profileStyle' | 'settings' | 'perms' | 'dev' | 'mod' | 'patron';

/** A serializable version of `UserDocument` which only has properties that can safely be exposed to the client that owns the user data. */
export type PrivateUser = (
	Pick<UserDocument, PrivateUserDocumentKey>
	& {
		id: string,
		created: number,
		lastSeen: number,
		birthdate: number
	}
);

/** All keys whose values have the same serializable type in both `DocumentUser` and `PublicUser`. */
type PublicUserDocumentKey = 'name' | 'description' | 'icon' | 'site' | 'achievements' | 'profileStyle' | 'dev' | 'mod' | 'patron';

/** A serializable version of `UserDocument` which only has properties that can safely be exposed to any client. */
export type PublicUser = (
	Pick<UserDocument, PublicUserDocumentKey>
	& {
		id: string,
		created: number,
		lastSeen: number,
		birthdate?: number,
		email?: UserDocument['email'],
		favs?: UserDocument['favs']
	}
);

export const UserContext = React.createContext<PrivateUser | undefined>(undefined);
// Using a React context is necessary here so the user data can be used server-side.

/**
 * Re-renders the component when the current authenticated user changes (or signs in/out).
 *
 * Returns the current authenticated user.
 */
export const useUser = () => useContext(UserContext);

let globalUserState: PrivateUser | undefined;
let globalSetUserState: React.Dispatch<React.SetStateAction<PrivateUser | undefined>> | undefined;

/** Gets the current authenticated user. */
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

/** Opens a dialog prompting the user to sign in or sign up. */
export const signIn = async () => {
	startLoading();
	const { openSignInDialog } = await import('modules/client/auth');
	stopLoading();
	openSignInDialog();
};

type SessionAPI = APIClient<typeof import('pages/api/session').default>;

/** Opens a dialog prompting the user to sign out. */
export const signOut = async () => {
	if ((
		await new Dialog({
			id: 'sign-out',
			title: 'Sign Out',
			content: 'Are you sure you want to sign out?',
			actions: ['Yes', 'No']
		})
	)?.submit) {
		await (api as SessionAPI).delete('session');
		setUser(undefined);
	}
};