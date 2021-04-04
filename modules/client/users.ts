import type { UserDocument } from 'modules/server/users';
import React, { useContext, useState } from 'react';
import api from 'modules/client/api';
import type { APIClient } from 'modules/client/api';
import { startLoading, stopLoading } from 'components/LoadingIndicator';

/** All keys whose values have the same serializable type in both `DocumentUser` and `PrivateUser`. */
type PrivateUserDocumentKey = 'name' | 'email' | 'verified' | 'description' | 'icon' | 'site' | 'comicSaves' | 'achievements' | 'favs' | 'profileStyle' | 'settings' | 'perms' | 'dev' | 'mod' | 'patron' | 'nameColor';

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
type PublicUserDocumentKey = 'name' | 'description' | 'icon' | 'site' | 'achievements' | 'profileStyle' | 'dev' | 'mod' | 'patron' | 'nameColor';

/** A serializable version of `UserDocument` which only has properties that can safely be exposed to any client. */
export type PublicUser = (
	Pick<UserDocument, PublicUserDocumentKey>
	& {
		id: string,
		created: number,
		lastSeen: number,
		favs?: UserDocument['favs']
	}
);

export const UserContext = React.createContext<PrivateUser | undefined>(undefined);

/**
 * Re-renders the component when the current authenticated user changes (or signs in/out).
 * 
 * Returns the current authenticated user.
 */
export const useUser = () => useContext(UserContext);

let globalUser: PrivateUser | undefined;
let globalSetUserState: React.Dispatch<React.SetStateAction<PrivateUser | undefined>> | undefined;

/** Gets the current authenticated user. */
export const getUser = () => globalUser;

/** Sets the current authenticated user and re-renders all components using it. */
export const setUser = (user: PrivateUser | undefined) => {
	if (globalSetUserState) {
		globalSetUserState(user);
	}
};

export const useUserState = (userProp: PrivateUser | undefined) => {
	const [user, setUserState] = useState(userProp);
	
	globalUser = user;
	globalSetUserState = setUserState;
	
	return user;
};

/** Opens a dialog prompting the user to sign in or sign up. */
export const signIn = async () => {
	startLoading();
	const { openSignInDialog } = await import('modules/client/auth');
	openSignInDialog();
	stopLoading();
};

type SessionAPI = APIClient<typeof import('pages/api/session').default>;

/** Deletes the user's sign-in session. */
export const signOut = async () => {
	await (api as SessionAPI).delete('session');
	setUser(undefined);
};