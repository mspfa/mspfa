import db from 'modules/server/db';
import type { Quirk } from 'modules/client/quirks';
import type { URLString } from 'modules/types';
import type { PrivateStory, PublicStory } from 'modules/client/stories';
import { StoryStatus, StoryPrivacy } from 'modules/client/stories';
import type { UserDocument, UserID } from 'modules/server/users';
import users from 'modules/server/users';
import type { APIResponse } from 'modules/server/api';

/** @minimum 1 */
export type StoryID = number;

/** @minimum 1 */
export type StoryPageID = number;

/**
 * @minLength 1
 * @maxLength 50
 * @pattern ^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$
 */
export type TagString = string;

export type StoryPage = {
	id: StoryPageID,
	published?: Date,
	/** @maxLength 500 */
	title: string,
	content: string,
	nextPages: number[],
	/** @uniqueItems */
	tags: TagString[],
	unlisted: boolean,
	commentary: string,
	comments: StoryComment[],
	/** Whether this page was set to notify readers on publish. */
	notify: boolean
};

export type StoryComment = {
	posted: Date,
	edited?: Date,
	author: UserID,
	/** @minLength 1 */
	content: string,
	/** @uniqueItems */
	likes: UserID[],
	/** @uniqueItems */
	dislikes: UserID[],
	private: boolean
};

export type StoryColor = {
	value: string,
	name: string
};

export type StoryDocument = {
	_id: StoryID,
	/** The date this story will be deleted from the database, or undefined if the story is not scheduled for deletion. */
	willDelete?: Date,
	created: Date,
	// Anniversary dates are stored as an object of `number`s instead of as a `Date` so that they are more efficient to query.
	anniversary: {
		// The `year` is only necessary because whether a day is valid depends on the year it's in.
		year: number,
		/**
		 * @minimum 0
		 * @maximum 11
		 */
		month: number,
		/**
		 * The anniversary's day of the month.
		 *
		 * @minimum 1
		 */
		day: number,
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
	owner: UserID,
	/**
	 * Users with permission to edit this adventure, not necessarily including the adventure's owner.
	 *
	 * @uniqueItems true
	 */
	editors: UserID[],
	author?: {
		name: string,
		site: '' | URLString
	},
	pages: StoryPage[],
	/** @maxLength 2000 */
	description: string,
	/** @maxLength 500 */
	blurb: string,
	icon: '' | URLString,
	favCount: number,
	banner: '' | URLString,
	style: string,
	/** Whether the story should ignore the reader's theme setting. */
	disableUserTheme: boolean,
	script: {
		unverified: string,
		verified: string
	},
	/**
	 * @uniqueItems true
	 * @maxItems 50
	 */
	tags: TagString[],
	commentsEnabled: boolean,
	/** Properties of the story which are only used in the story editor. */
	editorSettings: {
		defaultPageTitle: StoryPage['title'],
		defaultSpoiler: {
			open: string,
			close: string
		}
	},
	colors: StoryColor[],
	quirks: Quirk[]
};

/** A `Partial<StoryDocument>` used to spread some general properties on newly inserted `StoryDocument`s. */
export const defaultStory = {
	status: StoryStatus.Ongoing,
	privacy: StoryPrivacy.Public,
	editors: [] as never[],
	pages: [] as never[],
	description: '',
	blurb: '',
	icon: '',
	favCount: 0,
	banner: '',
	style: '',
	disableUserTheme: false,
	script: {
		unverified: '',
		verified: ''
	},
	tags: [] as never[],
	commentsEnabled: true,
	editorSettings: {
		defaultPageTitle: 'Next.',
		defaultSpoiler: {
			open: '',
			close: ''
		}
	},
	colors: [] as never[],
	quirks: [] as never[]
} as const;

// This is just for type safety on `defaultStory`.
const typeCheckedDefaultStory: Partial<StoryDocument> = defaultStory;
typeCheckedDefaultStory;

/** Converts a `StoryDocument` to a `PrivateStory`. */
export const getPrivateStory = (story: StoryDocument): PrivateStory => ({
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
	owner: story.owner.toString(),
	editors: story.editors.map(String),
	...story.author && {
		author: story.author
	},
	description: story.description,
	blurb: story.blurb,
	icon: story.icon,
	favCount: story.favCount,
	pageCount: story.pages.length,
	banner: story.banner,
	style: story.style,
	disableUserTheme: story.disableUserTheme,
	script: story.script,
	tags: story.tags,
	commentsEnabled: story.commentsEnabled,
	editorSettings: story.editorSettings,
	colors: story.colors,
	quirks: story.quirks
});

/** Converts a `StoryDocument` to a `PublicStory`. */
export const getPublicStory = (story: StoryDocument): PublicStory => ({
	id: story._id,
	created: +story.created,
	anniversary: story.anniversary,
	updated: +story.updated,
	title: story.title,
	status: story.status,
	privacy: story.privacy,
	owner: story.owner.toString(),
	editors: story.editors.map(String),
	...story.author && {
		author: story.author
	},
	description: story.description,
	blurb: story.blurb,
	icon: story.icon,
	favCount: story.favCount,
	pageCount: story.pages.length,
	style: story.style,
	disableUserTheme: story.disableUserTheme,
	script: story.script,
	tags: story.tags,
	commentsEnabled: story.commentsEnabled,
	colors: story.colors,
	quirks: story.quirks
});

const stories = db.collection<StoryDocument>('stories');

export default stories;

/**
 * Finds and returns a `StoryDocument` by a possibly unsafe ID.
 *
 * Returns `undefined` if the ID is invalid or the story is not found.
 *
 * If the `res` parameter is specified, failing to find a valid story will result in an error response, and this function will never resolve.
 */
export const getStoryByUnsafeID = <Res extends APIResponse<any> | undefined>(
	...[id, res, allowDeleted]: [
		id: string | number | undefined,
		res: Res,
		/** Whether this function should be allowed to find deleted stories. */
		allowDeleted?: boolean
	] | [
		id: string | number | undefined
		// It is necessary to use tuple types instead of simply having `res` be an optional parameter, because otherwise `Res` will not always be inferred correctly.
	]
) => new Promise<StoryDocument | (undefined extends Res ? undefined : never)>(async resolve => {
	const storyID: StoryID = id !== undefined && id !== '' ? +id : NaN;

	let story: StoryDocument | null | undefined;

	if (!Number.isNaN(storyID)) {
		story = await stories.findOne({
			_id: storyID,
			...!allowDeleted && {
				willDelete: { $exists: false }
			}
		});
	}

	if (!story) {
		if (res) {
			res.status(404).send({
				message: 'No story was found with the specified ID.'
			});
		} else {
			resolve(undefined as any);
		}

		return;
	}

	resolve(story);
});

export const getPublicStoriesByEditor = async (editor: UserDocument) => (
	stories.find!({
		editors: editor._id,
		privacy: StoryPrivacy.Public,
		willDelete: { $exists: false }
	}).map(getPublicStory).toArray()
);

/** Updates the specified story's `favCount`. Sends the new `{ favCount }` as an API response. */
export const updateAndSendFavCount = async (
	res: APIResponse<{
		body: {
			favCount: StoryDocument['favCount']
		}
	}>,
	storyID: StoryID
) => {
	const favCount = (
		await users.aggregate!([
			{ $match: { favs: storyID } },
			{ $count: 'favCount' }
		]).next() as { favCount: number } | null
	)?.favCount || 0;

	await stories.updateOne({
		_id: storyID
	}, {
		$set: { favCount }
	});

	res.send({ favCount });
};