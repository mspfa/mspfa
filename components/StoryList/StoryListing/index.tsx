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
import BBCode, { sanitizeBBCode } from 'components/BBCode';
import { Fragment } from 'react';

export type StoryListingProps = {
	children: PublicStory
};

const StoryListing = ({ children: publicStory }: StoryListingProps) => {
	const user = useUser();

	let description = sanitizeBBCode(publicStory.description, { noBB: true });
	const descriptionLineBreakIndex = description.indexOf('\n');
	description = (
		descriptionLineBreakIndex === -1
			? description
			: description.slice(0, descriptionLineBreakIndex)
	);

	return (
		<>
			<Link href={`/s/${publicStory.id}/p/1`}>
				<IconImage className="story-listing-icon" src={publicStory.icon} />
			</Link>
			<div className="story-listing-content">
				<Link
					className="story-listing-title translucent-text"
					href={`/s/${publicStory.id}/p/1`}
				>
					{publicStory.title}
				</Link>
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
				{description && (
					<div className="story-listing-description">
						<BBCode raw>
							{description}
						</BBCode>
					</div>
				)}
				<div className="story-listing-tags">
					{publicStory.tags.map((tag, i) => (
						<Fragment key={tag}>
							{i !== 0 && ' '}
							<Link key={tag} className="story-tag">
								#{tag}
							</Link>
						</Fragment>
					))}
				</div>
			</div>
		</>
	);
};

export default StoryListing;