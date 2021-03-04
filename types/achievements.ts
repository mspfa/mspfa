export type Achievement = {
	name: string,
	desc: string
};

export const achievements = {
	someAchievement: {
		name: 'Cool Achievement',
		desc: 'Whoever has this is cool.'
	} as Achievement
};