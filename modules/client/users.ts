import createGlobalState from 'global-react-state';
import type { UserDocument } from 'modules/server/users';
import type { Serializable } from 'modules/types';

type ClientUserKey = 'created' | 'lastSeen' | 'birthdate' | 'name' | 'email' | 'verified' | 'description' | 'icon' | 'site' | 'comicSaves' | 'achievements' | 'favs' | 'profileStyle' | 'settings' | 'dev' | 'mod' | 'patron' | 'nameColor';

/** This is a serializable version of `UserDocument` which only has properties that can safely be exposed to the client that owns the user data. */
export type ClientUser = (
	{ id: string }
	& Serializable<(
		Pick<UserDocument, ClientUserKey>
	)>
);

export const [useUser, setUser, getUser] = createGlobalState<ClientUser | undefined>(undefined);