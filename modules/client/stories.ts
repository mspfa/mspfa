import type { StoryDocument, StoryID, StoryPage, StoryPageID } from 'modules/server/stories';
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

/** All keys whose values have the same serializable type in both `StoryDocument` and `PrivateStory`. */
type PrivateStoryDocumentKey = 'anniversary' | 'title' | 'status' | 'privacy' | 'author' | 'description' | 'blurb' | 'icon' | 'pageCount' | 'favCount' | 'banner' | 'style' | 'disableUserTheme' | 'script' | 'tags' | 'allowComments' | 'defaultPageTitle' | 'spoilerPresets' | 'colors' | 'quirks';

/** A serializable version of `StoryDocument` with only the properties that can safely be exposed to any client. */
export type PrivateStory = Pick<StoryDocument, PrivateStoryDocumentKey> & {
	id: StoryID,
	willDelete?: DateNumber,
	created: DateNumber,
	updated: DateNumber,
	owner: string,
	editors: string[],
	pageCount: number
};

/** All keys whose values have the same serializable type in both `StoryDocument` and `PublicStory`. */
type PublicStoryDocumentKey = 'anniversary' | 'title' | 'status' | 'privacy' | 'author' | 'description' | 'blurb' | 'icon' | 'pageCount' | 'favCount' | 'style' | 'disableUserTheme' | 'script' | 'tags' | 'allowComments' | 'colors' | 'quirks';

/** A serializable version of `StoryDocument` with only the properties that can safely be exposed to any client. */
export type PublicStory = Pick<StoryDocument, PublicStoryDocumentKey> & {
	id: StoryID,
	created: DateNumber,
	updated: DateNumber,
	owner: string,
	editors: string[],
	pageCount: number
};

/** All keys whose values have the same serializable type in both `StoryPage` and `ClientStoryPage`. */
type ClientStoryPageKey = 'id' | 'title' | 'content' | 'nextPages' | 'unlisted' | 'disableControls' | 'commentary' | 'notify';

/** A serializable version of `StoryPage` with only the properties that can safely be exposed to any client. */
export type ClientStoryPage = Pick<StoryPage, ClientStoryPageKey> & {
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