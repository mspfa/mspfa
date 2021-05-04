import db from 'modules/server/db';
import type { Quirk } from 'modules/client/quirks';
import type { URLString } from 'modules/types';

export type StoryPage = {
	published: Date,
	title: string,
	content: string,
	nextPages: number[],
	tags: string[],
	hidden: boolean,
	commentary?: string
};

export type StoryPageDraft = StoryPage & {
	notify: boolean
};

export enum StoryStatus {
	Inactive = 0,
	Ongoing,
	Complete,
	Discontinued
}

export type StoryComment = {
	posted: Date,
	edited?: Date,
	page: number,
	author: number,
	content: string,
	likes: string[],
	dislikes: string[],
	private: boolean
};

export type StoryColor = {
	value: string,
	name: string
};

export type StoryDocument = {
	_id: number,
	created: Date,
	updated: Date,
	title: string,
	status: StoryStatus,
	owner: string,
	editors: string[],
	author?: {
		name: string,
		site?: URLString
	},
	pages: StoryPage[],
	drafts: StoryPageDraft[],
	/** @maxLength 2000 */
	description: string,
	icon?: URLString,
	banner?: URLString,
	style: string,
	/** Whether the story should ignore the reader's theme setting. */
	disableUserTheme: boolean,
	script: {
		unverified: string,
		verified: string
	},
	tags: string[],
	commentsEnabled: boolean,
	comments: StoryComment[],
	/** Properties of the story which are only used in the story editor. */
	editorSettings: {
		defaultPageTitle: StoryPage['title'],
		defaultSpoiler: {
			openLabel: string,
			closeLabel: string
		},
		colors: StoryColor[]
	},
	quirks: Quirk[]
};

const stories = db.collection<StoryDocument>('stories');

export default stories;