import type { StoryDocument } from 'modules/server/stories';

export enum StoryStatus {
	Inactive = 0,
	Ongoing,
	Complete,
	Discontinued
}

/** All keys whose values have the same serializable type in both `StoryDocument` and `PrivateStory`. */
type PrivateStoryDocumentKey = 'title' | 'status' | 'owner' | 'editors' | 'author' | 'description' | 'icon' | 'banner' | 'style' | 'disableUserTheme' | 'script' | 'tags' | 'commentsEnabled' | 'editorSettings' | 'colors' | 'quirks';

/** A serializable version of `StoryDocument` which only has properties that can safely be exposed to any client. */
export type PrivateStory = (
	Pick<StoryDocument, PrivateStoryDocumentKey>
	& {
		id: StoryDocument['_id'],
		created: number,
		updated: number
	}
);

/** All keys whose values have the same serializable type in both `StoryDocument` and `PublicStory`. */
type PublicStoryDocumentKey = 'title' | 'status' | 'owner' | 'editors' | 'author' | 'description' | 'icon' | 'style' | 'disableUserTheme' | 'script' | 'tags' | 'commentsEnabled' | 'colors' | 'quirks';

/** A serializable version of `StoryDocument` which only has properties that can safely be exposed to any client. */
export type PublicStory = (
	Pick<StoryDocument, PublicStoryDocumentKey>
	& {
		id: StoryDocument['_id'],
		created: number,
		updated: number
	}
);