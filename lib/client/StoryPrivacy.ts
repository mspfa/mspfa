enum StoryPrivacy {
	Public = 0,
	Unlisted,
	Private
}

export default StoryPrivacy;

export const storyPrivacyNames: Record<StoryPrivacy, string> = {
	[StoryPrivacy.Public]: 'Public',
	[StoryPrivacy.Unlisted]: 'Unlisted',
	[StoryPrivacy.Private]: 'Private'
};