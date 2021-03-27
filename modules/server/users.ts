import db from 'modules/server/db';
import type { ObjectId } from 'mongodb';
import { Theme } from 'modules/server/themes';
import type { achievements } from 'modules/server/achievements';
import type { URLString } from 'modules/types';

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
	/** @minLength 1 */
	name: string,
	/**
	 * The following regular expression is copied directly from https://html.spec.whatwg.org/multipage/input.html#valid-e-mail-address.
	 * @pattern ^[a-zA-Z0-9.!#$%&'*+\/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$
	 */
	email: string,
	verified: boolean,
	description: string,
	icon?: URLString,
	site?: URLString,
	comicSaves: Record<number, number>,
	achievements: Partial<Record<keyof typeof achievements, true>>,
	favs: number[],
	profileStyle: string,
	settings: {
		emailPublic: boolean,
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
		pixelatedImages: boolean,
		theme: Theme,
		style: string,
		keybinds: {
			back: string,
			forward: string,
			toggleSpoilers: string
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
		unrestrictedAccess: true,
		verifyScripts: true,
		manageComics: true,
		destroyComics: true,
		ban: true,
		manageComments: true,
		manageAchievements: true
	}>,
	dev?: true, // Hey that's me.
	mod?: true,
	patron?: true,
	nameColor?: string,
	legacyID?: number
};

export const defaultUser = {
	verified: false,
	description: '',
	comicSaves: {} as Record<never, never>,
	achievements: {} as Record<never, never>,
	favs: [] as never[],
	profileStyle: '',
	settings: {
		emailPublic: false,
		favsPublic: true,
		ads: {
			side: true,
			matchedContent: true
		},
		autoOpenSpoilers: false,
		preloadImages: true,
		stickyNav: true,
		pixelatedImages: false,
		theme: Theme.Standard,
		style: '',
		keybinds: {
			back: 'ArrowLeft',
			forward: 'ArrowRight',
			toggleSpoilers: 'Space'
		},
		notifications: {
			messages: NotificationSetting.All,
			userTags: NotificationSetting.All,
			commentReplies: NotificationSetting.All,
			comicDefaults: {
				updates: NotificationSetting.All,
				news: NotificationSetting.All,
				comments: NotificationSetting.All
			},
			comics: {} as Record<never, never>
		}
	},
	perms: {} as Record<never, never>
} as const;

const users = db.collection<UserDocument>('users');

export default users;