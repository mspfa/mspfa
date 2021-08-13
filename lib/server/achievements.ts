export type Achievement = {
	name: string,
	description: string
};

export const achievements = {
	someAchievement: {
		name: 'Cool Achievement',
		description: 'Whoever has this is cool.'
	} as Achievement
};