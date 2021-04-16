import db, { safeObjectID } from 'modules/server/db';
import type { ObjectId } from 'mongodb';
import type { achievements } from 'modules/server/achievements';
import type { URLString, EmailString } from 'modules/types';
import type { PrivateUser, PublicUser } from 'modules/client/users';
import type { UnsafeObjectID } from 'modules/server/db';
import type { Theme } from 'modules/client/themes';
import type { Perm } from 'modules/server/perms';

export type ExternalAuthMethod = {
	type: 'google' | 'discord',
	/** @minLength 1 */
	value: string
};

export type InternalAuthMethod = {
	type: 'password',
	/** @minLength 8 */
	value: string,
	/** Whether the password was created on the old site. */
	legacy?: true
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

export type ComicReaderNotificationSettingKeys = 'updates' | 'news';

export type ComicEditorNotificationSettingKeys = 'comments';

export type ComicReaderNotificationSettings = (
	// Include the reader keys.
	Record<ComicReaderNotificationSettingKeys, NotificationSetting>
	// Include the editor keys as optional `undefined`s.
	& Partial<Record<ComicEditorNotificationSettingKeys, undefined>>
);

export type ComicEditorNotificationSettings = (
	// Include the reader and editor keys.
	Record<ComicReaderNotificationSettingKeys | ComicEditorNotificationSettingKeys, NotificationSetting>
);

/**
 * `true` if the setting should inherit the user's default comic notification settings.
 *
 * `ComicReaderNotificationSettings | ComicEditorNotificationSettings` otherwise.
 */
export type ComicNotificationSettings = true | ComicReaderNotificationSettings | ComicEditorNotificationSettings;

export type UserDocument = {
	_id: ObjectId,
	authMethods: AuthMethod[],
	sessions: UserSession[],
	created: Date,
	/** The date of the last authenticated request the user sent to the site. */
	lastSeen: Date,
	birthdate: Date,
	/**
	 * @minLength 1
	 * @maxLength 32
	 */
	name: string,
	email: EmailString,
	verified: boolean,
	description: string,
	icon?: URLString,
	site?: URLString,
	/** An object where each key is a comic ID, and its value is a page number of that comic. */
	comicSaves: Record<number, number>,
	achievements: Partial<Record<keyof typeof achievements, true>>,
	favs: number[],
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
		/** This makes images on adjacent pages always preload when a user visits a comic page. */
		preloadImages: boolean,
		/** This makes the nav bar always stay at the top of the screen when scrolling below it. */
		stickyNav: boolean,
		/** This sets the image rendering style to nearest-neighbor on images which the user might want that on (such as comic panels). */
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
			/** These are the comic notification settings set by default when the user first enables notifications for a comic. */
			comicDefaults: ComicEditorNotificationSettings,
			comics: Record<number, ComicNotificationSettings>
		}
	},
	perms: Partial<Record<Perm, true>>,
	dev?: true,
	mod?: true,
	patron?: true,
	nameColor?: string,
	legacyID?: number
};

/** A `Partial<UserDocument>` used to spread some general properties on newly inserted `UserDocument`s. */
export const defaultUser = {
	sessions: [] as never[],
	verified: false,
	description: '',
	comicSaves: {} as Record<never, never>,
	achievements: {} as Record<never, never>,
	favs: [] as never[],
	profileStyle: '',
	settings: {
		emailPublic: false,
		birthdatePublic: false,
		favsPublic: true,
		ads: {
			side: true,
			matchedContent: true
		},
		autoOpenSpoilers: false,
		preloadImages: true,
		stickyNav: false,
		imageSharpening: false,
		theme: 'standard',
		style: '',
		controls: {
			back: 'ArrowLeft',
			forward: 'ArrowRight',
			toggleSpoilers: 'Space'
		},
		notifications: {
			messages: { email: true, site: true },
			userTags: { email: true, site: true },
			commentReplies: { email: true, site: true },
			comicDefaults: {
				updates: { email: true, site: true },
				news: { email: true, site: true },
				comments: { email: true, site: true }
			},
			comics: {} as Record<never, never>
		}
	},
	perms: {} as Record<never, never>
} as const;

// This is just for type safety on `defaultUser` and should never be referenced.
const typeCheckedDefaultUser: Partial<UserDocument> = defaultUser;
typeCheckedDefaultUser;

/** Converts a `UserDocument` to a `PrivateUser`. */
export const getPrivateUser = (user: UserDocument): PrivateUser => {
	const privateUser = {
		id: user._id.toString(),
		created: +user.created,
		lastSeen: +user.lastSeen,
		birthdate: +user.birthdate,
		name: user.name,
		email: user.email,
		verified: user.verified,
		description: user.description,
		icon: user.icon,
		site: user.site,
		comicSaves: user.comicSaves,
		achievements: user.achievements,
		favs: user.favs,
		profileStyle: user.profileStyle,
		settings: user.settings,
		perms: user.perms,
		dev: user.dev,
		mod: user.mod,
		patron: user.patron,
		nameColor: user.nameColor
	};

	// Remove any `undefined` properties from the object so it is serializable.
	for (const key in privateUser) {
		if (privateUser[key as keyof typeof privateUser] === undefined) {
			delete privateUser[key as keyof typeof privateUser];
		}
	}

	return privateUser;
};

/** Converts a `UserDocument` to a `PublicUser`. */
export const getPublicUser = (user: UserDocument): PublicUser => {
	const publicUser = {
		id: user._id.toString(),
		created: +user.created,
		lastSeen: +user.lastSeen,
		birthdate: user.settings.birthdatePublic ? +user.birthdate : undefined,
		name: user.name,
		email: user.settings.emailPublic ? user.email : undefined,
		description: user.description,
		icon: user.icon,
		site: user.site,
		achievements: user.achievements,
		favs: user.settings.favsPublic ? user.favs : undefined,
		profileStyle: user.profileStyle,
		dev: user.dev,
		mod: user.mod,
		patron: user.patron,
		nameColor: user.nameColor
	};

	// Remove any `undefined` properties from the object so it is serializable.
	for (const key in publicUser) {
		if (publicUser[key as keyof typeof publicUser] === undefined) {
			delete publicUser[key as keyof typeof publicUser];
		}
	}

	return publicUser;
};

const users = db.collection<UserDocument>('users');

export default users;

/**
 * Finds and returns a `UserDocument` by a possibly unsafe ID.
 *
 * Returns `undefined` if the ID is invalid or the user is not found.
 */
export const getUserByUnsafeID = async (id: UnsafeObjectID) => {
	const userID = safeObjectID(id);
	if (userID) {
		const user = await users.findOne({
			_id: userID
		});
		if (user) {
			return user;
		}
	}
};