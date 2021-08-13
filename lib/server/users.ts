import db, { safeObjectID } from 'lib/server/db';
import type { ObjectId } from 'mongodb';
import type { achievements } from 'lib/server/achievements';
import type { URLString, EmailString, integer } from 'lib/types';
import type { PrivateUser, PublicUser } from 'lib/client/users';
import { defaultSettings } from 'lib/client/users';
import type { UnsafeObjectID } from 'lib/server/db';
import type { Theme } from 'lib/client/themes';
import type { StoryID, StoryPageID } from 'lib/server/stories';
import type { APIResponse } from 'lib/server/api';

export type ServerUserID = ObjectId;

type AuthMethodProperties = {
	id: string,
	/** A display name to represent this auth method. */
	name?: string
};

export type ExternalAuthMethod = AuthMethodProperties & {
	type: 'google' | 'discord',
	/** @minLength 1 */
	value: string
};

/** @minLength 8 */
export type PasswordString = string;

export type InternalAuthMethod = AuthMethodProperties & {
	type: 'password',
	value: PasswordString
};

export type AuthMethod = ExternalAuthMethod | InternalAuthMethod;

export type UserSession = {
	token: string,
	lastUsed: Date,
	ip?: string
};

export type NotificationSetting = {
	email: boolean,
	site: boolean
};

export type StoryReaderNotificationSettingKey = 'updates' | 'news';

export type StoryEditorNotificationSettingKey = 'comments';

export type StoryReaderNotificationSettings = (
	// Include the reader keys.
	Record<StoryReaderNotificationSettingKey, NotificationSetting>
	// Include the editor keys as optional `undefined`s.
	& Partial<Record<StoryEditorNotificationSettingKey, undefined>>
);

export type StoryEditorNotificationSettings = (
	// Include the reader and editor keys.
	Record<StoryReaderNotificationSettingKey | StoryEditorNotificationSettingKey, NotificationSetting>
);

/**
 * `true` if the setting should inherit the user's default story notification settings.
 *
 * `StoryReaderNotificationSettings | StoryEditorNotificationSettings` otherwise.
 */
export type StoryNotificationSettings = true | StoryReaderNotificationSettings | StoryEditorNotificationSettings;

/** A user object used on the server and stored in the database. No `ServerUser` can ever be on the client. */
export type ServerUser = {
	_id: ServerUserID,
	/** The user's verified email address. */
	email?: EmailString,
	unverifiedEmail?: EmailString,
	/**
	 * @minLength 1
	 * @maxLength 32
	 */
	name: string,
	/** The date this user will be deleted from the database, or undefined if the user is not scheduled for deletion. */
	willDelete?: Date,
	created: Date,
	/** The date of the last authenticated request the user sent to the site. */
	lastSeen: Date,
	birthdate: Date,
	/** Whether the user has ever changed their birthdate after creating their account. */
	birthdateChanged: boolean,
	authMethods: AuthMethod[],
	sessions: UserSession[],
	/** @maxLength 2000 */
	description: string,
	icon: '' | URLString,
	site: '' | URLString,
	/** A record that maps each story ID to the page ID the user has saved in that story. */
	storySaves: Record<StoryID, StoryPageID>,
	achievements: Partial<Record<keyof typeof achievements, true>>,
	/** @uniqueItems true */
	favs: StoryID[],
	profileStyle: string,
	settings: {
		emailPublic: boolean,
		birthdatePublic: boolean,
		favsPublic: boolean,
		autoOpenSpoilers: boolean,
		/** This makes the nav bar always stay at the top of the screen when scrolling below it. */
		stickyNav: boolean,
		/** This sets the image rendering style to nearest-neighbor on images which the user might want that on (such as story panels). */
		imageAliasing: boolean,
		theme: Theme,
		style: string,
		controls: {
			previousPage: string,
			nextPage: string,
			toggleSpoilers: string
		},
		notifications: {
			messages: NotificationSetting,
			userTags: NotificationSetting,
			commentReplies: NotificationSetting,
			/** These are the story notification settings set by default when the user first enables notifications for a story. */
			storyDefaults: StoryEditorNotificationSettings,
			stories: Record<StoryID, StoryNotificationSettings>
		}
	},
	/**
	 * Determines which users this user is allowed to manage. Lower is more permissive. `undefined` is equivalent to `Infinity`, which prevents managing any users.
	 *
	 * Someone with a certain `permLevel` is able to manage any user with a `permLevel` greater than their own (within what is allowed by their `perms`), but they cannot manage anyone whose `permLevel` is less than or equal to their own.
	 *
	 * @minimum 1
	 */
	permLevel?: integer,
	/** A bitwise OR of the user's `Perm`s. */
	perms: integer,
	dev?: true,
	mod?: true,
	patron?: true,
	unreadMessageCount: integer
};

/** A `Partial<ServerUser>` used to spread some general properties on newly inserted `ServerUser`s. */
export const defaultUser = {
	sessions: [] as never[],
	birthdateChanged: false,
	description: '',
	icon: '',
	site: '',
	storySaves: {} as Record<never, never>,
	achievements: {} as Record<never, never>,
	favs: [] as never[],
	profileStyle: '',
	settings: defaultSettings,
	perms: 0,
	unreadMessageCount: 0
} as const;

// This is just for partial type safety on `defaultUser`.
const typeCheckedDefaultUser: Partial<ServerUser> = defaultUser;
typeCheckedDefaultUser;

/** Converts a `ServerUser` to a `PrivateUser`. */
export const getPrivateUser = (user: ServerUser): PrivateUser => ({
	id: user._id.toString(),
	...user.email && {
		email: user.email
	},
	...user.unverifiedEmail && {
		unverifiedEmail: user.unverifiedEmail
	},
	name: user.name,
	created: +user.created,
	lastSeen: +user.lastSeen,
	birthdate: +user.birthdate,
	birthdateChanged: user.birthdateChanged,
	description: user.description,
	icon: user.icon,
	site: user.site,
	storySaves: user.storySaves,
	achievements: user.achievements,
	favs: user.favs,
	profileStyle: user.profileStyle,
	settings: user.settings,
	perms: user.perms,
	...user.dev && {
		dev: user.dev
	},
	...user.mod && {
		mod: user.mod
	},
	...user.patron && {
		patron: user.patron
	},
	unreadMessageCount: user.unreadMessageCount
});

/** Converts a `ServerUser` to a `PublicUser`. */
export const getPublicUser = (user: ServerUser): PublicUser => ({
	id: user._id.toString(),
	...user.email !== undefined && user.settings.emailPublic && {
		email: user.email
	},
	name: user.name,
	created: +user.created,
	lastSeen: +user.lastSeen,
	...user.settings.birthdatePublic && {
		birthdate: +user.birthdate
	},
	description: user.description,
	icon: user.icon,
	site: user.site,
	achievements: user.achievements,
	...user.settings.favsPublic && {
		favs: user.favs
	},
	profileStyle: user.profileStyle,
	...user.dev && {
		dev: user.dev
	},
	...user.mod && {
		mod: user.mod
	},
	...user.patron && {
		patron: user.patron
	}
});

const users = db.collection<ServerUser>('users');

export default users;

/**
 * Finds and returns a `ServerUser` by a possibly unsafe ID.
 *
 * Returns `undefined` if the ID is invalid, the user is not found, or the user is scheduled for deletion.
 *
 * If the `res` parameter is specified, failing to find a valid user will result in an error response, and this function will never resolve.
 */
export const getUserByUnsafeID = <Res extends APIResponse<any> | undefined>(
	...[id, res]: [
		id: UnsafeObjectID,
		res: Res
	] | [
		id: UnsafeObjectID
		// It is necessary to use tuple types instead of simply having `res` be an optional parameter, because otherwise `Res` will not always be inferred correctly.
	]
) => new Promise<ServerUser | (undefined extends Res ? undefined : never)>(async resolve => {
	const userID = safeObjectID(id);

	let user: ServerUser | null | undefined;

	if (userID) {
		user = await users.findOne({
			_id: userID,
			willDelete: { $exists: false }
		});
	}

	if (!user) {
		if (res) {
			res.status(404).send({
				message: 'No user was found with the specified ID.'
			});
		} else {
			resolve(undefined as any);
		}

		return;
	}

	resolve(user);
});