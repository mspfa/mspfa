export type ComicPage = {
	published: Date,
	name: string,
	content: string,
	nextPages: number[],
	tags: string[],
	hidden?: boolean,
	commentary?: string
};

export type ComicPageDraft = ComicPage & {
	notify: boolean
};

export enum ComicStatus {
	Inactive = 0,
	Ongoing,
	Complete,
	Discontinued
}

export type ComicDocument = {
	created: Date,
	updated: Date,
	name: string,
	status: ComicStatus,
	owner: string,
	editors: string[],
	author?: {
		name: string,
		site: string
	},
	pages: ComicPage[],
	drafts: ComicPageDraft[],
	desc: string,
	icon?: string,
	banner?: string,
	hearts: string[],
	bells: string[],
	style: string,
	script: {
		unverified: string,
		verified: string
	},
	tags: string[]
};