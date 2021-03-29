import type { UserDocument } from 'modules/server/users';
import React, { useContext, useState } from 'react';
import api from 'modules/client/api';
import type { APIClient } from 'modules/client/api';

type ClientUserDocumentKey = 'name' | 'email' | 'verified' | 'description' | 'icon' | 'site' | 'comicSaves' | 'achievements' | 'favs' | 'profileStyle' | 'settings' | 'dev' | 'mod' | 'patron' | 'nameColor';

/** This is a serializable version of `UserDocument` which only has properties that can safely be exposed to the client that owns the user data. */
export type ClientUser = (
	Pick<UserDocument, ClientUserDocumentKey>
	& {
		id: string,
		created: number,
		lastSeen: number,
		birthdate: number
	}
);

export const UserContext = React.createContext<ClientUser | undefined>(undefined);

/**
 * Re-renders the component when the current authenticated user changes (or signs in/out).
 * 
 * Returns the current authenticated user.
 */
export const useUser = () => useContext(UserContext);

let globalUser: undefined | ClientUser;
let globalSetUserState: undefined | React.Dispatch<React.SetStateAction<ClientUser | undefined>>;

/** Gets the current authenticated user. */
export const getUser = () => globalUser;

/** Sets the current authenticated user and re-renders all components using it. */
export const setUser = (user: ClientUser | undefined) => {
	if (globalSetUserState) {
		globalSetUserState(user);
	}
};

export const useUserState = (userProp: ClientUser | undefined) => {
	const [user, setUserState] = useState(userProp);
	
	globalUser = user;
	globalSetUserState = setUserState;
	
	return user;
};

type SessionAPI = APIClient<typeof import('pages/api/session').default>;

export const signOut = async () => {
	await (api as SessionAPI).delete('session');
	setUser(undefined);
};