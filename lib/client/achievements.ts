export type Achievement = {
	readonly name: string,
	readonly description: string
};

export const achievements = {
	author: {
		name: 'Humble Beginnings',
		description: 'Embark on your first adventure.'
	},
	get10Favs: {
		name: 'A Tentative Following',
		description: 'Reach 10 favorites on one of your adventures.'
	},
	get100Favs: {
		name: 'A Burgeoning Benjamin',
		description: 'Reach 100 favorites on one of your adventures.'
	},
	get413Favs: {
		name: 'A Momentous Constant',
		description: 'Reach 413 favorites on one of your adventures.'
	},
	get1KFavs: {
		name: 'A Grand Attainment',
		description: 'Reach 1,000 favorites on one of your adventures.'
	},
	veteran: {
		name: 'Veteran Adventurer',
		description: 'Go online at least 3 years after you first signed up for MSPFA.'
	},
	contribute: {
		name: 'Distinguished Enhancer',
		description: 'Contribute something unique and helpful to the website itself.'
	},
	donate: {
		name: 'Loyal Benefactor',
		description: 'Donate some money to MSPFA.'
	},
	reportBug: {
		name: 'Blunder Scout',
		description: 'Report a new, confirmable bug, no matter how small. If you found a bug but already have this achievement, feel free to let a friend report the bug instead so they can have it too.'
	},
	hack: {
		name: 'The Yellow Yard',
		description: 'Hack your way into acquiring this achievement.'
	}
} as const satisfies Record<string, Achievement>;

export type AchievementID = keyof typeof achievements;
