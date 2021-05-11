import './styles.module.scss';
import IconImage from 'components/IconImage';
import type { PublicStory } from 'modules/client/stories';
import { storyStatusNames } from 'modules/client/stories';
import Link from 'components/Link';
import HeartButton from 'components/Button/HeartButton';

export type StoryListingProps = {
	children: PublicStory
};

const StoryListing = ({ children: publicStory }: StoryListingProps) => (
	<>
		<IconImage className="story-listing-icon" src={publicStory.icon} />
		<div className="story-listing-content">
			<div className="story-listing-title">
				<Link href={`/s/${publicStory.id}/p/1`}>
					{publicStory.title}
				</Link>
			</div>
			<HeartButton className="story-listing-favs">
				{publicStory.favCount}
			</HeartButton>
			<span className="story-listing-pages spaced">
				{publicStory.pageCount}
			</span>
			<span className="story-listing-status spaced">
				{storyStatusNames[publicStory.status]}
			</span>
		</div>
	</>
);

export default StoryListing;