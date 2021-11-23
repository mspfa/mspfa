import db from 'lib/server/db';
import type { DateNumber, integer, Mutable, URLString } from 'lib/types';
import type { ClientStoryPage, PrivateStory, PublicStory } from 'lib/client/stories';
import StoryStatus from 'lib/client/StoryStatus';
import StoryPrivacy from 'lib/client/StoryPrivacy';
import type { ServerUser, ServerUserID } from 'lib/server/users';
import users from 'lib/server/users';
import type { APIResponse } from 'lib/server/api';
import type { UpdateFilter } from 'mongodb';
import type { ServerComment } from 'lib/server/comments';
import type { ClientPreviousPageIDs } from 'components/StoryViewer';
import { PAGE_PRELOAD_DEPTH } from 'components/StoryViewer';
import type { ServerNewsPost } from 'lib/server/news';
import type { TagString } from 'lib/client/storyTags';
import type { ServerColor, ServerColorGroup } from 'lib/server/colors';
import { getClientColorGroup, getClientColor } from 'lib/server/colors';

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
	/** Whether this page should notify readers on publish. */
	notify: boolean
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
	owner: story.owner.toString(),
	editors: story.editors.map(String),
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
	owner: story.owner.toString(),
	editors: story.editors.map(String),
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
	notify: page.notify
});

const stories = db.collection<ServerStory>('stories');

export default stories;

/**
 * Finds and returns a `ServerStory` by a possibly unsafe ID.
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
) => new Promise<ServerStory | (undefined extends Res ? undefined : never)>(async resolve => {
	const storyID: StoryID = (
		id !== undefined && id !== ''
			? +id
			: NaN
	);

	let story: ServerStory | null | undefined;

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

/** Gets all the public stories owned or edited by a user. */
export const getPublicStoriesByEditor = async (editor: ServerUser) => (
	stories.find!({
		privacy: StoryPrivacy.Public,
		$or: [{
			owner: editor._id
		}, {
			editors: editor._id
		}],
		willDelete: { $exists: false }
	}).map(getPublicStory).toArray()
);

/** Updates the specified story's `favCount`. Returns the new `favCount` value. */
export const updateFavCount = async (storyID: StoryID) => {
	const favCount = (
		await users.aggregate!<{ favCount: integer }>([
			{ $match: { favs: storyID } },
			{ $count: 'favCount' }
		]).next()
	)?.favCount || 0;

	await stories.updateOne({
		_id: storyID
	}, {
		$set: { favCount }
	});

	return favCount;
};

/** The maximum duration accepted by `setTimeout`. */
const MAX_TIMEOUT = 2147483647;

/** A record that maps each story ID in the record to a timeout that calls `updateStorySchedule` on that story. */
const storySchedules: Partial<Record<StoryID, NodeJS.Timeout>> = {};

export const unscheduleStory = (storyID: StoryID) => {
	const oldTimeout = storySchedules[storyID];

	if (oldTimeout) {
		clearTimeout(oldTimeout);
		delete storySchedules[storyID];
	}
};

/**
 * Publishes due scheduled pages, sets a new timeout to rerun this function for future scheduled pages if there are any, and updates the story's `pageCount` and `updated` properties.
 *
 * Applies any database updates either determined within this function or passed into its `update` parameter.
 */
export const updateStorySchedule = async (
	/**
	 * The `ServerStory` being updated.
	 *
	 * ⚠️ Ensure `story.pages` matches what it would be in the database at the time AFTER this function's database update. Also ensure `story.pageCount` and `story.updated` match what they are in the database at the time BEFORE this function is called.
	 */
	story: ServerStory,
	/**
	 * An update filter for this story. Any updates from this function will be added to this object. Upon this function's completion, anything on this object will be updated to the database for this story. Defaults to an empty object.
	 *
	 * This parameter is useful purely as an optimization, in order to avoid unnecessarily calling `updateOne` on the same story twice (once inside this function, and again outside wherever this function is being called), allowing it to instead only be called once inside.
	 */
	update: Omit<UpdateFilter<ServerStory>, '$set' | '$unset'> & {
		$set?: Mutable<UpdateFilter<ServerStory>['$set']>,
		$unset?: Mutable<UpdateFilter<ServerStory>['$unset']>
	} = {}
) => {
	unscheduleStory(story._id);

	if (!update.$set) {
		update.$set = {};
	}

	if (!update.$unset) {
		update.$unset = {};
	}

	/** The new value to be set into `story.pageCount`. */
	let newPageCount = 0;
	/** The initial `DateNumber` of `story.updated`. */
	const oldUpdated = +story.updated;
	/** The new `DateNumber` to be set into `story.updated`. */
	let newUpdated = oldUpdated;

	// Store the current date into a variable so it is not a different value each time, helping avoid inconsistencies.
	const now = Date.now();

	for (const page of Object.values(story.pages)) {
		const published = +(page.published ?? Infinity);

		if (page.scheduled) {
			if (published > now) {
				// Ensure this is the first scheduled page and thus holds the next schedule date.
				if (!storySchedules[story._id]) {
					// Set a timeout to rerun this function on the next schedule date.
					// This timeout must be set before any async calls in this function, to avoid race conditions due to the delay argument being out of date.
					storySchedules[story._id] = setTimeout(async () => {
						updateStorySchedule(
							(await stories.findOne({
								_id: story._id
							}))!
							// The above non-nullability assertion is correct because either the story should be found at the end of this timeout, or whatever deleted it should clear this timeout so this point is never reached.
						);
					}, Math.min(
						// The time until the schedule date.
						published - Date.now(),
						// If the time until the schedule date is over the `MAX_TIMEOUT`, it's still fine if the timeout finishes before the schedule date, because whenever the timeout finishes, `setTimeout` would be called here again.
						MAX_TIMEOUT
					));
				}
			} else {
				// This scheduled page is due, so publish it.

				update.$unset[`pages.${page.id}.scheduled`] = true;
			}
		}

		// Check for published, listed pages.
		if (published <= now && !page.unlisted) {
			// Since this page is public, set the page count to its ID.
			newPageCount = page.id;
			// The reason we don't run `newPageCount++` here instead is because it's better to use the ID of the last public page as the page count rather than the actual quantity of public pages. If we did use the actual quantity of public pages as the page count, then for example, if a story's last public page ID is 40 but there is a single earlier page which is unlisted, then the page count would say 39. For those who notice this inconsistency, it could be confusing, appear to be a bug, or even hint at an unlisted page which they might then actively look for. Simply using the ID of the last public page rather than the true public page count avoids all of this with no tangible issues.

			// If this published, listed page has notifying enabled and should be published after the current `updated` date of the story, then the `updated` date must be adjusted to account for the new latest `published` date.
			if (page.notify && published > newUpdated) {
				newUpdated = published;
			}
		}
	}

	if (newPageCount !== story.pageCount) {
		update.$set.pageCount = newPageCount;
	}

	if (newUpdated !== oldUpdated) {
		update.$set.updated = new Date(newUpdated);

		// TODO: Set update queries for publish notifications here, or something like that.
	}

	if (!Object.values(update.$set).length) {
		delete update.$set;
	}

	if (!Object.values(update.$unset).length) {
		delete update.$unset;
	}

	if (Object.values(update).length) {
		await stories.updateOne({
			_id: story._id
		}, update);
	}
};

/** Gets information about a specified story's pages within the `PAGE_PRELOAD_DEPTH` around the specified page ID. */
export const getClientPagesAround = (
	story: ServerStory,
	pageID: StoryPageID,
	/** Whether the user is in preview mode (which allows accessing unpublished pages) and has permission to be in preview mode. */
	previewMode?: boolean,
	now: DateNumber = Date.now()
) => {
	/**
	 * A record that maps each page ID to a sorted array of all page IDs before it that link to it via `nextPages`.
	 *
	 * For example, if page 6 maps to `[4, 5]`, that means pages 4 and 5 have 6 is their `nextPages`.
	 */
	const previousPageIDs: Partial<Record<StoryPageID, StoryPageID[]>> = {};

	// Compute the `previousPageIDs`.
	for (const page of Object.values(story.pages)) {
		for (const nextPageID of page.nextPages) {
			// Don't consider the `page` a previous page if it's after the `nextPageID` being linked i.e. if the page link goes backward.
			if (nextPageID < page.id) {
				continue;
			}

			if (!(nextPageID in previousPageIDs)) {
				previousPageIDs[nextPageID] = [];
			}

			previousPageIDs[nextPageID]!.push(page.id);
		}
	}

	/**
	 * A record of pages to send to the client.
	 *
	 * If a page ID maps to `null`, then the page does not exist to the client, letting the client know not to try to request it.
	 */
	const clientPages: Record<StoryPageID, ClientStoryPage | null> = {};

	/** The initial `ClientPreviousPageIDs` to send to the client. */
	const clientPreviousPageIDs: ClientPreviousPageIDs = {};

	/** Adds pages to `clientPages`, doing the same for their `previousPageIDs` and `nextPages` recursively until the recursion depth reaches the `PAGE_PRELOAD_DEPTH`. */
	const addToClientPages = (
		/** The ID of the page to add to `clientPages`. */
		pageID: StoryPageID,
		/** The recursion depth of this function call. */
		depth = 0
	) => {
		// If this page is already added, then don't continue.
		if (pageID in clientPages) {
			return;
		}

		// This is asserted as nullable because `pageID` may not index a real page.
		const serverPage = story.pages[pageID] as ServerStoryPage | undefined;

		// If this page doesn't exist or the user doesn't have access to it, then set it to `null` and don't continue.
		if (!serverPage || (
			!previewMode && (
				// Check if this page is not public.
				serverPage.published === undefined || +serverPage.published > now
			)
		)) {
			clientPages[pageID] = null;
			return;
		}

		const clientPage = getClientStoryPage(story.pages[pageID]);

		// Add the `clientPage` to `clientPages`.
		clientPages[pageID] = clientPage;
		// Add the first of the `clientPage`'s `previousPageIDs` to `clientPreviousPageIDs`, or `null` if this page has no previous pages.
		clientPreviousPageIDs[pageID] = previousPageIDs[pageID]?.[0] || null;

		if (++depth > PAGE_PRELOAD_DEPTH) {
			// If this iteration has reached the `PAGE_PRELOAD_DEPTH`, don't iterate any deeper.
			return;
		}

		// Call this function on each of this page's `nextPages`.
		for (const nextPageID of clientPage.nextPages) {
			addToClientPages(nextPageID, depth);
		}

		// Call this function on each of the `previousPageIDsOfThisPage`, if there are any.
		const previousPageIDsOfThisPage = previousPageIDs[pageID];
		if (previousPageIDsOfThisPage) {
			for (const previousPageID of previousPageIDsOfThisPage) {
				addToClientPages(previousPageID, depth);
			}
		}
	};

	addToClientPages(pageID);

	return { clientPages, clientPreviousPageIDs };
};