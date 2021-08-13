export type UserBadge = {
	label: string,
	description: string,
	color: string
};

export const userBadges = {
	dev: {
		label: 'Developer',
		description: 'This user is an official developer of the MSPFA website.',
		color: ''
	} as UserBadge,
	mod: {
		label: 'Moderator',
		description: 'This user is an official moderator on the MSPFA website.',
		color: ''
	} as UserBadge,
	patron: {
		label: 'Patron',
		description: 'This user is an active patron of MSPFA.',
		color: ''
	} as UserBadge
};