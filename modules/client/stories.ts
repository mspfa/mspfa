import type { ServerStory, StoryID, ServerStoryPage, StoryPageID } from 'modules/server/stories';
import type { DateNumber } from 'modules/types';

export enum StoryStatus {
	Inactive = 0,
	Ongoing,
	Complete,
	Discontinued
}

export const storyStatusNames: Record<StoryStatus, string> = {
	[StoryStatus.Inactive]: 'Inactive',
	[StoryStatus.Ongoing]: 'Ongoing',
	[StoryStatus.Complete]: 'Complete',
	[StoryStatus.Discontinued]: 'Discontinued'
};

export enum StoryPrivacy {
	Public = 0,
	Unlisted,
	Private
}

export const storyPrivacyNames: Record<StoryPrivacy, string> = {
	[StoryPrivacy.Public]: 'Public',
	[StoryPrivacy.Unlisted]: 'Unlisted',
	[StoryPrivacy.Private]: 'Private'
};

/** All keys whose values have the same serializable type in both `ServerStory` and `PrivateStory`. */
type PrivateServerStoryKey = 'anniversary' | 'title' | 'status' | 'privacy' | 'author' | 'description' | 'blurb' | 'icon' | 'pageCount' | 'favCount' | 'banner' | 'style' | 'disableUserTheme' | 'script' | 'tags' | 'allowComments' | 'defaultPageTitle' | 'spoilerPresets' | 'colors' | 'quirks';

/** A serializable version of `ServerStory` with only the properties that can safely be exposed to any client. */
export type PrivateStory = Pick<ServerStory, PrivateServerStoryKey> & {
	id: StoryID,
	willDelete?: DateNumber,
	created: DateNumber,
	updated: DateNumber,
	owner: string,
	editors: string[],
	pageCount: number
};

/** All keys whose values have the same serializable type in both `ServerStory` and `PublicStory`. */
type PublicServerStoryKey = 'anniversary' | 'title' | 'status' | 'privacy' | 'author' | 'description' | 'blurb' | 'icon' | 'pageCount' | 'favCount' | 'style' | 'disableUserTheme' | 'script' | 'tags' | 'allowComments' | 'colors' | 'quirks';

/** A serializable version of `ServerStory` with only the properties that can safely be exposed to any client. */
export type PublicStory = Pick<ServerStory, PublicServerStoryKey> & {
	id: StoryID,
	created: DateNumber,
	updated: DateNumber,
	owner: string,
	editors: string[],
	pageCount: number
};

/** All keys whose values have the same serializable type in both `ServerStoryPage` and `ClientStoryPage`. */
type ClientStoryPageKey = 'id' | 'title' | 'content' | 'nextPages' | 'unlisted' | 'disableControls' | 'commentary' | 'notify';

/** A serializable version of `ServerStoryPage` with only the properties that can safely be exposed to any client. */
export type ClientStoryPage = Pick<ServerStoryPage, ClientStoryPageKey> & {
	published?: DateNumber
};

export type ClientStoryPageRecord = Record<StoryPageID, ClientStoryPage>;

export const getBlurb = (story: PublicStory) => (
	story.blurb || (
		story.description.length > 500
			? `${story.description.slice(0, 500)}...`
			: story.description
	)
);