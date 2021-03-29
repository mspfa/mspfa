import createGlobalState from 'global-react-state';
import type { UserDocument } from 'modules/server/users';

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

export const [useUser, setUser, getUser] = createGlobalState<ClientUser | undefined>(undefined);