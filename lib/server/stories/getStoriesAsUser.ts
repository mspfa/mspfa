import type { ServerUser } from 'lib/server/users';
import type { Filter } from 'mongodb';
import type { ServerStory } from 'lib/server/stories';
import stories, { getPublicStory } from 'lib/server/stories';
import { Perm } from 'lib/client/perms';
import StoryPrivacy from 'lib/client/StoryPrivacy';

/** Queries the database for stories and filters them to include only the ones that the specified user should be able to find. */
const getStoriesAsUser = (
	/** The user finding the stories. Undefined if the client finding the stories is not authenticated. */
	user: ServerUser | undefined,
	/**
	 * Whether the user should be able to find unlisted stories that match the filter.
	 *
	 * Automatically overwritten as `true` if `user.perms & Perm.sudoRead`.
	 */
	includeUnlistedStories: boolean,
	/**
	 * The database filter to query stories by.
	 *
	 * By default, `willDelete: { $exists: false }` is assigned to the copy of this filter used by this function, so it is not necessary to include.
	 */
	filter: Filter<ServerStory>
) => {
	filter = {
		...filter,
		willDelete: { $exists: false }
	};

	const sudoReadPerm = user && user.perms & Perm.sudoRead;

	if (sudoReadPerm) {
		includeUnlistedStories = true;
	}

	/** Queries public stories, or both public and unlisted stories if `includeUnlistedStories`. */
	const privacyFilter: Filter<ServerStory> = {
		privacy: (
			includeUnlistedStories
				? { $in: [StoryPrivacy.Public, StoryPrivacy.Unlisted] }
				: StoryPrivacy.Public
		)
	};

	return stories.find!(
		user
			? sudoReadPerm
				? filter
				: {
					$and: [filter, {
						$or: [privacyFilter, {
							// Include private unlisted/private adventures which the user owns or edits.
							$and: [{
								privacy: (
									includeUnlistedStories
										// If `includeUnlistedStories`, then unlisted stories are already included by the `$or` condition's `privacyFilter`, so they don't need to be included here.
										? StoryPrivacy.Private
										: { $in: [StoryPrivacy.Unlisted, StoryPrivacy.Private] }
								)
							}, {
								$or: [
									{ owner: user._id },
									{ editors: user._id }
								]
							}]
						}]
					}]
				}
			: Object.assign(filter, privacyFilter)
	).map(getPublicStory);
};

export default getStoriesAsUser;