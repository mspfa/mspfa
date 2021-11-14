import type { PrivateUser } from 'lib/client/users';

const defaultUserSettings: PrivateUser['settings'] = {
	emailPublic: false,
	birthdatePublic: false,
	favsPublic: true,
	autoOpenSpoilers: false,
	stickyNav: false,
	imageAliasing: false,
	theme: 'standard',
	style: '',
	controls: {
		previousPage: 'ArrowLeft',
		nextPage: 'ArrowRight',
		toggleSpoilers: 'Space'
	},
	notifications: {
		messages: { email: true, site: true },
		userTags: { email: true, site: true },
		commentReplies: { email: true, site: true },
		storyDefaults: {
			updates: { email: true, site: true },
			news: { email: true, site: true },
			comments: { email: true, site: true }
		},
		stories: {} as Record<never, never>
	}
} as const;

export default defaultUserSettings;