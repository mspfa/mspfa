import './styles.module.scss';
import type { PublicStory } from 'modules/client/stories';
import StoryListing from 'components/StoryList/StoryListing';

export type StoryListProps = {
	children: PublicStory[]
};

const StoryList = ({ children: publicStories }: StoryListProps) => (
	<div className="story-list">
		{publicStories.map(publicStory => (
			<StoryListing key={publicStory.id}>
				{publicStory}
			</StoryListing>
		))}
	</div>
);

export default StoryList;