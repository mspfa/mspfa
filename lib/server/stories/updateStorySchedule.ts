import type { Mutable } from 'lib/types';
import type { UpdateFilter } from 'mongodb';
import type { StoryID, ServerStory } from 'lib/server/stories';
import stories from 'lib/server/stories';

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
const updateStorySchedule = async (
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
	let newUpdated = +story.created;

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

			// Set the story's `updated` date to the `published` date of its most recently published, non-unlisted, non-silent page.
			if (!page.silent && published > newUpdated) {
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

export default updateStorySchedule;