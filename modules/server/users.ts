import db from 'modules/server/db';
import type { ObjectId } from 'mongodb';
import type { Theme } from 'modules/server/themes';
import type { achievements } from 'modules/server/achievements';

export type ExternalAuthMethod = {
	type: 'google' | 'discord',
	value: string
};

export type InternalAuthMethod = {
	type: 'password',
	value: string,
	/** Whether the password was created on the old site. */
	legacy?: true
};

export type AuthMethod = ExternalAuthMethod | InternalAuthMethod;

export type UserSession = {
	token: string,
	lastUsed: Date,
	ip: string
};

export enum NotificationSetting {
	Off = 0b00,
	Site = 0b01,
	Email = 0b10,
	All = 0b11
}

export type ComicNotificationSettings = {
	updates: NotificationSetting,
	news: NotificationSetting,
	comments: NotificationSetting
};

export type UserDocument = {
	_id: ObjectId,
	authMethods: AuthMethod[],
	sessions: UserSession[],
	created: Date,
	/** The date of the last authenticated request the user sent to the site. */
	lastSeen: Date,
	birthdate: Date,
	name: string,
	/**
	 * The following regular expression is explicitly copied from https://html.spec.whatwg.org/multipage/input.html#valid-e-mail-address.
	 * @pattern ^[a-zA-Z0-9.!#$%&'*+\/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$
	 */
	email: string,
	verified: boolean,
	description: string,
	icon: string,
	website: string,
	comicSaves: Record<number, number>,
	achievements: Partial<Record<keyof typeof achievements, true>>,
	favs: number[],
	profileStyle: string,
	settings: {
		emailPublic: boolean,
		favsPublic: boolean,
		sideAdVisible: boolean,
		matchedContentAdVisible: boolean,
		autoOpenSpoilers: boolean,
		/** This makes images on adjacent pages always preload when a user visits a comic page. */
		preloadImages: boolean,
		/** This makes the nav bar always stay at the top of the screen when scrolling below it. */
		stickyNav: boolean,
		/** This sets the image rendering style to nearest-neighbor on images which the user might want that on (such as comic panels). */
		pixelatedImages: boolean,
		theme: Theme,
		style: string,
		keybinds: {
			back: number,
			forward: number,
			toggleSpoilers: number
		},
		notifications: {
			messages: NotificationSetting,
			userTags: NotificationSetting,
			commentReplies: NotificationSetting,
			/** These are the comic notification settings set by default when the user first enables notifications for a comic. */
			comicDefaults: ComicNotificationSettings,
			comics: Record<number, ComicNotificationSettings>
		}
	},
	perms: Partial<{
		unrestrictedAccess: boolean,
		verifyScripts: boolean,
		manageComics: boolean,
		destroyComics: boolean,
		ban: boolean, // AKA destroyUsers
		manageComments: boolean,
		manageAchievements: boolean
	}>,
	dev: boolean, // Hey that's me.
	mod: boolean,
	patron: boolean,
	nameColor?: string,
	legacyID?: number
};

const users = db.collection<UserDocument>('users');

export default users;