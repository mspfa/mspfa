import db from 'lib/server/db';
import type { integer, URLString } from 'lib/types';
import type { ClientStoryPage, PrivateStory, PublicStory } from 'lib/client/stories';
import StoryStatus from 'lib/client/StoryStatus';
import StoryPrivacy from 'lib/client/StoryPrivacy';
import type { ServerUserID } from 'lib/server/users';
import type { ServerComment } from 'lib/server/comments';
import type { ServerNewsPost } from 'lib/server/news';
import type { TagString } from 'lib/client/storyTags';
import type { ServerColor, ServerColorGroup } from 'lib/server/colors';
import { getClientColorGroup, getClientColor } from 'lib/server/colors';
import stringifyID from 'lib/server/db/stringifyID';

/** @minimum 1 */
export type StoryID = integer;

/** @minimum 1 */
export type StoryPageID = integer;

// I call them `ServerStoryPage`s instead of `Page`s
export type ServerStoryPage = {
	id: StoryPageID,
	/** The date that the page was or will be published, or undefined if the page is still a draft. */
	published?: Date,
	/** `true` if this page still needs to be processed for publishing, otherwise undefined. */
	scheduled?: true,
	/** @maxLength 500 */
	title: string,
	content: string,
	nextPages: StoryPageID[],
	unlisted: boolean,
	/** Whether the client's controls should be disabled while this page is rendered. */
	disableControls: boolean,
	commentary: string,
	/** This page's comments sorted from newest to oldest. */
	comments: ServerComment[],
	/** If true, publishing the page should neither cause notifications nor change the story's `updated` value. */
	silent: boolean
};

export type StoryPageRecord = Record<StoryPageID, ServerStoryPage>;

/** A story object used on the server and stored in the database. No `ServerStory` can ever be on the client. */
export type ServerStory = {
	_id: StoryID,
	/** The date this story will be deleted from the database, or undefined if the story is not scheduled for deletion. */
	willDelete?: Date,
	created: Date,
	// Anniversary dates are stored as an object of numbers instead of as a single `Date` so that they are more efficient to query.
	anniversary: {
		// The `year` is only necessary because whether a day is valid depends on the year it's in.
		year: integer,
		/**
		 * @minimum 0
		 * @maximum 11
		 */
		month: integer,
		/**
		 * The anniversary's day of the month.
		 *
		 * @minimum 1
		 */
		day: integer,
		/** Whether a user has ever changed the anniversary. */
		changed: boolean
	},
	updated: Date,
	/**
	 * @minLength 1
	 * @maxLength 50
	 */
	title: string,
	status: StoryStatus,
	privacy: StoryPrivacy,
	owner: ServerUserID,
	/**
	 * Users with permission to edit this adventure, not necessarily including the adventure's owner.
	 *
	 * @uniqueItems true
	 */
	editors: ServerUserID[],
	author?: {
		name: string,
		site: '' | URLString
	},
	pages: StoryPageRecord,
	/** @maxLength 2000 */
	description: string,
	icon: '' | URLString,
	/**
	 * The public page count (the ID of the last public page).
	 *
	 * ⚠️ Does not necessarily equal `Object.values(story.pages).length` due to excluding pages which are not public.
	 */
	pageCount: integer,
	favCount: integer,
	banner: '' | URLString,
	style: string,
	script: {
		unverified: string,
		verified: string
	},
	/**
	 * @uniqueItems true
	 * @maxItems 50
	 */
	tags: TagString[],
	allowComments: boolean,
	/** @maxLength 2000 */
	sidebarContent: string,
	/** This story's news posts sorted from newest to oldest. */
	news: ServerNewsPost[],
	defaultPageTitle: ServerStoryPage['title'],
	colorGroups: ServerColorGroup[],
	/** All of this story's saved colors (for use in `ColorTool`). */
	colors: ServerColor[]
};

/** A `Partial<ServerStory>` used to spread some general properties on newly inserted `ServerStory`s. */
export const defaultStory = {
	status: StoryStatus.Ongoing,
	privacy: StoryPrivacy.Public,
	editors: [] as never[],
	pages: {} as Record<never, never>,
	description: '',
	icon: '',
	pageCount: 0,
	favCount: 0,
	banner: '',
	style: '',
	script: {
		unverified: '',
		verified: ''
	},
	tags: [] as never[],
	allowComments: true,
	sidebarContent: '',
	news: [] as never[],
	defaultPageTitle: 'Next.',
	colorGroups: [] as never[],
	colors: [] as never[]
} as const;

// This is just for partial type safety on `defaultStory`.
const typeCheckedDefaultStory: Partial<ServerStory> = defaultStory;
typeCheckedDefaultStory;

/** Converts a `ServerStory` to a `PrivateStory`. */
export const getPrivateStory = (story: ServerStory): PrivateStory => ({
	id: story._id,
	...story.willDelete !== undefined && {
		willDelete: +story.willDelete
	},
	created: +story.created,
	anniversary: story.anniversary,
	updated: +story.updated,
	title: story.title,
	status: story.status,
	privacy: story.privacy,
	owner: stringifyID(story.owner),
	editors: story.editors.map(stringifyID),
	...story.author && {
		author: story.author
	},
	description: story.description,
	icon: story.icon,
	pageCount: story.pageCount,
	favCount: story.favCount,
	banner: story.banner,
	style: story.style,
	script: story.script,
	tags: story.tags,
	allowComments: story.allowComments,
	sidebarContent: story.sidebarContent,
	defaultPageTitle: story.defaultPageTitle,
	colorGroups: story.colorGroups.map(getClientColorGroup),
	colors: story.colors.map(getClientColor)
});

/** Converts a `ServerStory` to a `PublicStory`. */
export const getPublicStory = (story: ServerStory): PublicStory => ({
	id: story._id,
	created: +story.created,
	anniversary: story.anniversary,
	updated: +story.updated,
	title: story.title,
	status: story.status,
	privacy: story.privacy,
	owner: stringifyID(story.owner),
	editors: story.editors.map(stringifyID),
	...story.author && {
		author: story.author
	},
	description: story.description,
	icon: story.icon,
	pageCount: story.pageCount,
	favCount: story.favCount,
	style: story.style,
	script: story.script,
	tags: story.tags,
	allowComments: story.allowComments,
	sidebarContent: story.sidebarContent
});

/** Converts a `ServerStoryPage` to a `ClientStoryPage`. */
export const getClientStoryPage = (page: ServerStoryPage): ClientStoryPage => ({
	id: page.id,
	...page.published !== undefined && {
		published: +page.published
	},
	title: page.title,
	content: page.content,
	nextPages: page.nextPages,
	unlisted: page.unlisted,
	disableControls: page.disableControls,
	commentary: page.commentary,
	silent: page.silent
});

const stories = db.collection<ServerStory>('stories');

export default stories;