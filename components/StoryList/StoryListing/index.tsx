import './styles.module.scss';
import IconImage from 'components/IconImage';
import type { PublicStory } from 'modules/client/stories';
import { storyStatusNames, getBlurb } from 'modules/client/stories';
import Link from 'components/Link';
import FavButton from 'components/Button/FavButton';
import EditButton from 'components/Button/EditButton';
import { useUser } from 'modules/client/users';
import { Perm } from 'modules/client/perms';
import PagesIcon from 'components/LabeledIcon/PagesIcon';
import { Fragment, useCallback, useState } from 'react';
import BBCode from 'components/BBCode';

export type StoryListingProps = {
	children: PublicStory
};

const StoryListing = ({ children: publicStory }: StoryListingProps) => {
	const user = useUser();
	const [open, setOpen] = useState(false);

	const toggleOpen = useCallback(() => {
		setOpen(open => !open);
	}, []);

	const blurb = getBlurb(publicStory);

	return (
		<>
			<Link href={`/s/${publicStory.id}/p/1`}>
				<IconImage
					className="story-listing-icon"
					src={publicStory.icon}
					title={publicStory.title}
				/>
			</Link>
			<div className="story-listing-content">
				<Link
					className="story-listing-title translucent-text"
					href={`/s/${publicStory.id}/p/1`}
					title={publicStory.title}
				>
					{publicStory.title}
				</Link>
				<div className="story-listing-meta">
					<span className="story-listing-status spaced">
						{storyStatusNames[publicStory.status]}
					</span>
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
				</div>
				{open && (
					<div className="story-listing-blurb">
						<BBCode>{blurb}</BBCode>
					</div>
				)}
				<div className="story-listing-tags">
					{blurb && (
						<Link
							className="story-listing-more-link"
							onClick={toggleOpen}
						>
							{open ? 'Show Less' : 'Show More'}
						</Link>
					)}
					{blurb && !!publicStory.tags.length && ' - '}
					{publicStory.tags.map(tag => (
						<Fragment key={tag}>
							{' '}
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