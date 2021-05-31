import type { StoryDocument, StoryID } from 'modules/server/stories';

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

/** All keys whose values have the same serializable type in both `StoryDocument` and `PrivateStory`. */
type PrivateStoryDocumentKey = 'title' | 'status' | 'author' | 'description' | 'blurb' | 'icon' | 'favCount' | 'banner' | 'style' | 'disableUserTheme' | 'script' | 'tags' | 'commentsEnabled' | 'editorSettings' | 'colors' | 'quirks';

/** A serializable version of `StoryDocument` which only has properties that can safely be exposed to any client. */
export type PrivateStory = (
	Pick<StoryDocument, PrivateStoryDocumentKey>
	& {
		id: StoryID,
		created: number,
		updated: number,
		owner: string,
		editors: string[],
		pageCount: number
	}
);

/** All keys whose values have the same serializable type in both `StoryDocument` and `PublicStory`. */
type PublicStoryDocumentKey = 'title' | 'status' | 'author' | 'description' | 'blurb' | 'icon' | 'favCount' | 'style' | 'disableUserTheme' | 'script' | 'tags' | 'commentsEnabled' | 'colors' | 'quirks';

/** A serializable version of `StoryDocument` which only has properties that can safely be exposed to any client. */
export type PublicStory = (
	Pick<StoryDocument, PublicStoryDocumentKey>
	& {
		id: StoryID,
		created: number,
		updated: number,
		owner: string,
		editors: string[],
		pageCount: number
	}
);

export const getBlurb = (story: PublicStory) => story.blurb || (
	story.description.length > 500
		? `${story.description.slice(0, 500)}...`
		: story.description
);