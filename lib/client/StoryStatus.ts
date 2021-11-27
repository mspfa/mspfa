enum StoryStatus {
	Ongoing = 0,
	Complete,
	Inactive,
	Discontinued
}

export default StoryStatus;

export const storyStatusNames: Record<StoryStatus, string> = {
	[StoryStatus.Ongoing]: 'Ongoing',
	[StoryStatus.Complete]: 'Complete',
	[StoryStatus.Inactive]: 'Inactive',
	[StoryStatus.Discontinued]: 'Discontinued'
};