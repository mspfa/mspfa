export type Achievement = {
	readonly name: string,
	readonly description: string
};

export const achievements = {
	fav: {
		name: '???',
		description: 'Favorite an adventure.'
	},
	author: {
		name: 'Humble Beginnings',
		description: 'Embark on your first very own adventure.'
	},
	get10Favs: {
		name: 'A Tentative Following',
		description: 'Reach 10 favorites on an adventure.'
	},
	get100Favs: {
		name: 'A Catalytic Reaction',
		description: 'Reach 100 favorites on an adventure.'
	},
	get413Favs: {
		name: 'A Momentous Constant',
		description: 'Reach 413 favorites on an adventure.'
	},
	get1KFavs: {
		name: 'A Grand Attainment',
		description: 'Reach 1,000 favorites on an adventure.'
	},
	veteran: {
		name: 'Veteran Adventurer',
		description: 'Go online at least 5 years after you first signed up for MSPFA.'
	},
	donate: {
		name: 'Loyal Benefactor',
		description: 'Donate some money to MSPFA.'
	},
	reportBug: {
		name: 'Blunder Scout',
		description: 'Report a new, confirmable bug, no matter how small.'
	},
	contribute: {
		name: 'Distinguished Enhancer',
		description: 'Contribute something unique and helpful to the website itself.'
	},
	hack: {
		name: 'The Yellow Yard',
		description: 'Hack your way into acquiring this achievement, and tell no one how you did it.'
	}
} as const satisfies Record<string, Achievement>;

export type AchievementID = keyof typeof achievements;
