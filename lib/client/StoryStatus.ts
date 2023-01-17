import type { RecursiveReadonly } from 'lib/types';

enum StoryStatus {
	Active = 0,
	Complete,
	Discontinued,
	Inactive,
	OffSite
}

export default StoryStatus;

export const storyStatusNames = [
	[StoryStatus.Complete, 'Complete'],
	[StoryStatus.Active, 'Active'],
	[StoryStatus.Inactive, 'Inactive'],
	[StoryStatus.Discontinued, 'Discontinued'],
	[StoryStatus.OffSite, 'Moved Off-Site']
] as const satisfies RecursiveReadonly<Array<[StoryStatus, string]>>;
