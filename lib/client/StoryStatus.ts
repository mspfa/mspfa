enum StoryStatus {
	Ongoing = 0,
	Complete,
	Discontinued,
	Inactive
}

export default StoryStatus;

export const storyStatusNames: Record<StoryStatus, string> = {
	[StoryStatus.Ongoing]: 'Ongoing',
	[StoryStatus.Complete]: 'Complete',
	[StoryStatus.Discontinued]: 'Discontinued',
	[StoryStatus.Inactive]: 'Inactive'
};