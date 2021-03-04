export type UserBadge = {
	label: string,
	desc: string,
	color: string
};

export const userBadges = {
	dev: {
		label: 'Developer',
		desc: 'This user is an official developer of the MSPFA website.',
		color: ''
	} as UserBadge,
	mod: {
		label: 'Moderator',
		desc: 'This user is an official moderator on the MSPFA website.',
		color: ''
	} as UserBadge,
	patron: {
		label: 'Patron',
		desc: 'This user is an active patron of MSPFA.',
		color: ''
	} as UserBadge
};