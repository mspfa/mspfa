enum StoryStatus {
	Active = 0,
	Complete,
	Discontinued,
	Inactive,
	MovedElsewhere
}

export default StoryStatus;

export const storyStatusNames: Record<StoryStatus, string> = {
	[StoryStatus.Active]: 'Active',
	[StoryStatus.Complete]: 'Complete',
	[StoryStatus.Discontinued]: 'Discontinued',
	[StoryStatus.Inactive]: 'Inactive',
	[StoryStatus.MovedElsewhere]: 'Moved Elsewhere'
};
