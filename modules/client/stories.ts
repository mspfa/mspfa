import type { StoryDocument, StoryID, StoryPage } from 'modules/server/stories';

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
type PrivateStoryDocumentKey = 'anniversary' | 'title' | 'status' | 'privacy' | 'author' | 'description' | 'blurb' | 'icon' | 'favCount' | 'banner' | 'style' | 'disableUserTheme' | 'script' | 'tags' | 'commentsEnabled' | 'editorSettings' | 'colors' | 'quirks';

/** A serializable version of `StoryDocument` which only has properties that can safely be exposed to any client. */
export type PrivateStory = Pick<StoryDocument, PrivateStoryDocumentKey> & {
	id: StoryID,
	willDelete?: number,
	created: number,
	updated: number,
	owner: string,
	editors: string[],
	pageCount: number
};

/** All keys whose values have the same serializable type in both `StoryDocument` and `PublicStory`. */
type PublicStoryDocumentKey = 'anniversary' | 'title' | 'status' | 'privacy' | 'author' | 'description' | 'blurb' | 'icon' | 'favCount' | 'style' | 'disableUserTheme' | 'script' | 'tags' | 'commentsEnabled' | 'colors' | 'quirks';

/** A serializable version of `StoryDocument` which only has properties that can safely be exposed to any client. */
export type PublicStory = Pick<StoryDocument, PublicStoryDocumentKey> & {
	id: StoryID,
	created: number,
	updated: number,
	owner: string,
	editors: string[],
	pageCount: number
};

/** All keys whose values have the same serializable type in both `StoryPage` and `ClientStoryPage`. */
type ClientStoryPageKey = 'id' | 'title' | 'content' | 'nextPages' | 'tags' | 'unlisted' | 'commentary' | 'notify';

/** A serializable version of `StoryPage` which only has properties that can safely be exposed to any client. */
export type ClientStoryPage = Pick<StoryPage, ClientStoryPageKey> & {
	published?: number
};

export const getBlurb = (story: PublicStory) => (
	story.blurb || (
		story.description.length > 500
			? `${story.description.slice(0, 500)}...`
			: story.description
	)
);