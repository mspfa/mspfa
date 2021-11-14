import type { ServerUser } from 'lib/server/users';
import type { DateNumber } from 'lib/types';

/** All keys whose values have the same serializable type in both `ServerUser` and `PrivateUser`. */
type PrivateServerUserKey = 'email' | 'unverifiedEmail' | 'name' | 'birthdateChanged' | 'description' | 'icon' | 'site' | 'favs' | 'achievements' | 'profileStyle' | 'settings' | 'perms' | 'dev' | 'mod' | 'patron' | 'unreadMessageCount';

/** A serializable version of `ServerUser` with only the properties that can safely be exposed to the client that owns the user data. */
export type PrivateUser = (
	Pick<ServerUser, PrivateServerUserKey>
	& {
		id: string,
		created: DateNumber,
		lastSeen: DateNumber,
		birthdate: DateNumber
	}
);

/** All keys whose values have the same serializable type in both `ServerUser` and `PublicUser`. */
type PublicServerUserKey = 'name' | 'description' | 'icon' | 'site' | 'achievements' | 'profileStyle' | 'dev' | 'mod' | 'patron';

/** A serializable version of `ServerUser` with only the properties that can safely be exposed to any client. */
export type PublicUser = (
	Pick<ServerUser, PublicServerUserKey>
	& {
		id: string,
		email?: ServerUser['email'],
		created: DateNumber,
		lastSeen: DateNumber,
		birthdate?: DateNumber,
		favs?: ServerUser['favs']
	}
);