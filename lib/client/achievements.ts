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
		name: 'Tentative Storyteller',
		description: 'Reach 10 favorites on one of your adventures.'
	},
	get100Favs: {
		name: 'Distant Admiration',
		description: 'Reach 100 favorites on one of your adventures.'
	},
	get413Favs: {
		name: 'What Will You Do?',
		description: 'Reach 413 favorites on one of your adventures.'
	},
	get1KFavs: {
		name: 'Unobtainable by Virtue',
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
} as const;

export type AchievementID = keyof typeof achievements;

// This is just for type safety on `achievements`.
const typeCheckedAchievements: Record<AchievementID, Achievement> = achievements;
typeCheckedAchievements;