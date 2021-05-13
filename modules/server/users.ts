import db, { safeObjectID } from 'modules/server/db';
import type { ObjectId } from 'mongodb';
import type { achievements } from 'modules/server/achievements';
import type { URLString, EmailString } from 'modules/types';
import type { PrivateUser, PublicUser } from 'modules/client/users';
import { defaultSettings } from 'modules/client/users';
import type { UnsafeObjectID } from 'modules/server/db';
import type { Theme } from 'modules/client/themes';
import type { StoryID } from 'modules/server/stories';

export type UserID = ObjectId;

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

export type StoryReaderNotificationSettingKeys = 'updates' | 'news';

export type StoryEditorNotificationSettingKeys = 'comments';

export type StoryReaderNotificationSettings = (
	// Include the reader keys.
	Record<StoryReaderNotificationSettingKeys, NotificationSetting>
	// Include the editor keys as optional `undefined`s.
	& Partial<Record<StoryEditorNotificationSettingKeys, undefined>>
);

export type StoryEditorNotificationSettings = (
	// Include the reader and editor keys.
	Record<StoryReaderNotificationSettingKeys | StoryEditorNotificationSettingKeys, NotificationSetting>
);

/**
 * `true` if the setting should inherit the user's default story notification settings.
 *
 * `StoryReaderNotificationSettings | StoryEditorNotificationSettings` otherwise.
 */
export type StoryNotificationSettings = true | StoryReaderNotificationSettings | StoryEditorNotificationSettings;

export type UserDocument = {
	_id: UserID,
	/** The user's verified email address. */
	email?: EmailString,
	unverifiedEmail?: EmailString,
	/**
	 * @minLength 1
	 * @maxLength 32
	 */
	name: string,
	created: Date,
	/** The date this user will be deleted from the database, or undefined if the user is not scheduled for deletion. */
	willDelete?: Date,
	/** The date of the last authenticated request the user sent to the site. */
	lastSeen: Date,
	birthdate: Date,
	authMethods: AuthMethod[],
	sessions: UserSession[],
	/** @maxLength 2000 */
	description: string,
	icon: '' | URLString,
	site: '' | URLString,
	/** An object where each key is a story ID, and its value is a page number of that story. */
	storySaves: Record<StoryID, number>,
	achievements: Partial<Record<keyof typeof achievements, true>>,
	/** @uniqueItems true */
	favs: StoryID[],
	profileStyle: string,
	settings: {
		emailPublic: boolean,
		birthdatePublic: boolean,
		favsPublic: boolean,
		ads: {
			side: boolean,
			matchedContent: boolean
		},
		autoOpenSpoilers: boolean,
		/** This makes images on adjacent pages always preload when a user visits a story page. */
		preloadImages: boolean,
		/** This makes the nav bar always stay at the top of the screen when scrolling below it. */
		stickyNav: boolean,
		/** This sets the image rendering style to nearest-neighbor on images which the user might want that on (such as story panels). */
		imageSharpening: boolean,
		theme: Theme,
		style: string,
		controls: {
			back: string,
			forward: string,
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
	permLevel?: number,
	/** A bitwise OR of the user's `Perm`s. */
	perms: number,
	dev?: true,
	mod?: true,
	patron?: true
};

/** A `Partial<UserDocument>` used to spread some general properties on newly inserted `UserDocument`s. */
export const defaultUser = {
	sessions: [] as never[],
	description: '',
	icon: '',
	site: '',
	storySaves: {} as Record<never, never>,
	achievements: {} as Record<never, never>,
	favs: [] as never[],
	profileStyle: '',
	settings: defaultSettings,
	perms: 0
} as const;

// This is just for type safety on `defaultUser`.
const typeCheckedDefaultUser: Partial<UserDocument> = defaultUser;
typeCheckedDefaultUser;

/** Converts a `UserDocument` to a `PrivateUser`. */
export const getPrivateUser = (user: UserDocument): PrivateUser => ({
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
	}
});

/** Converts a `UserDocument` to a `PublicUser`. */
export const getPublicUser = (user: UserDocument): PublicUser => ({
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

const users = db.collection<UserDocument>('users');

export default users;

/**
 * Finds and returns a `UserDocument` by a possibly unsafe ID.
 *
 * Returns `undefined` if the ID is invalid, the user is not found, or the user is scheduled for deletion.
 */
export const getUserByUnsafeID = async (id: UnsafeObjectID) => {
	const userID = safeObjectID(id);

	if (userID) {
		const user = await users.findOne({
			_id: userID,
			willDelete: {
				$exists: false
			}
		});

		if (user) {
			return user;
		}
	}
};

const everyFifteenMinutes = () => {
	users.deleteMany({
		willDelete: {
			$lte: new Date()
		}
	});
};

everyFifteenMinutes();

if (process.env.NODE_ENV !== 'development') {
	// Don't run this interval on dev, because dev would run this interval many times and require a restart to stop any of them.
	setInterval(everyFifteenMinutes, 1000 * 60 * 15);
}