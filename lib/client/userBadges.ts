export type UserBadge = {
	label: string,
	description: string,
	color: string
};

export const userBadges: Record<string, UserBadge> = {
	dev: {
		label: 'Developer',
		description: 'This user is an official developer of the MSPFA website.',
		color: ''
	},
	mod: {
		label: 'Moderator',
		description: 'This user is an official moderator on the MSPFA website.',
		color: ''
	},
	patron: {
		label: 'Patron',
		description: 'This user is an active patron of MSPFA.',
		color: ''
	}
};

// TODO: Badges