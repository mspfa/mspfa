import './styles.module.scss';
import IconImage from 'components/IconImage';
import type { PublicStory } from 'modules/client/stories';
import { storyStatusNames } from 'modules/client/stories';
import Link from 'components/Link';
import FavButton from 'components/Button/FavButton';
import EditButton from 'components/Button/EditButton';
import { useUser } from 'modules/client/users';
import { Perm } from 'modules/client/perms';
import PagesIcon from 'components/LabeledIcon/PagesIcon';

export type StoryListingProps = {
	children: PublicStory
};

const StoryListing = ({ children: publicStory }: StoryListingProps) => {
	const user = useUser();

	return (
		<>
			<Link href={`/s/${publicStory.id}/p/1`}>
				<IconImage className="story-listing-icon" src={publicStory.icon} />
			</Link>
			<div className="story-listing-content">
				<div
					className="story-listing-title"
					title={publicStory.title}
				>
					<Link
						className="translucent-text"
						href={`/s/${publicStory.id}/p/1`}
					>
						{publicStory.title}
					</Link>
				</div>
				<div className="story-listing-meta">
					{user && (
						// Check if the user has permission to edit this adventure.
						publicStory.editors.includes(user.id)
						|| user.perms & Perm.sudoRead
					) && (
						<EditButton className="spaced" storyID={publicStory.id} />
					)}
					<FavButton className="spaced" storyID={publicStory.id}>
						{publicStory.favCount}
					</FavButton>
					<PagesIcon className="spaced">
						{publicStory.pageCount}
					</PagesIcon>
					<span className="story-listing-status">
						{storyStatusNames[publicStory.status]}
					</span>
				</div>
			</div>
		</>
	);
};

export default StoryListing;