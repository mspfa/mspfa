import type { StoryDocument } from 'modules/server/stories';

export enum StoryStatus {
	Inactive = 0,
	Ongoing,
	Complete,
	Discontinued
}

/** A `Partial<StoryDocument>` used to spread some general properties on newly inserted `StoryDocument`s. */
export const defaultStory = {
	status: StoryStatus.Ongoing,
	pages: [] as never[],
	drafts: [] as never[],
	description: '',
	icon: '',
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
		},
		colors: [] as never[]
	},
	quirks: [] as never[]
} as const;

// This is just for type safety on `defaultStory`.
const typeCheckedDefaultUser: Partial<StoryDocument> = defaultStory;
typeCheckedDefaultUser;