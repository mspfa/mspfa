enum StoryStatus {
	Active = 0,
	Complete,
	Discontinued,
	Inactive,
	OffSite
}

export default StoryStatus;

// This must use a `Map` instead of a `Record` so the elements can be ordered independently of the `StoryStatus` enum.
export const storyStatusNames = new Map<StoryStatus, string>([
	[StoryStatus.Complete, 'Complete'],
	[StoryStatus.Active, 'Active'],
	[StoryStatus.Inactive, 'Inactive'],
	[StoryStatus.Discontinued, 'Discontinued'],
	[StoryStatus.OffSite, 'Moved Off-Site']
] satisfies Array<[StoryStatus, string]>);
