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
		<div className="listing">
			<Link
				className="listing-icon-container"
				href={`/s/${publicStory.id}/p/1`}
				title={publicStory.title}
			>
				<IconImage
					className="listing-icon"
					src={publicStory.icon}
					alt={publicStory.title}
				/>
			</Link>
			<div className="listing-info">
				<Link
					className="listing-title translucent-text"
					href={`/s/${publicStory.id}/p/1`}
					title={publicStory.title}
				>
					{publicStory.title}
				</Link>
				<div className="listing-section listing-info">
					<span className="listing-status spaced">
						{storyStatusNames[publicStory.status]}
					</span>
					{user && (
						publicStory.owner === user.id
						|| publicStory.editors.includes(user.id)
						|| !!(user.perms & Perm.sudoRead)
					) && (
						<EditButton
							className="spaced"
							href={`/s/${publicStory.id}/edit/p`}
							title="Edit Adventure"
						/>
					)}
					<FavButton className="spaced" storyID={publicStory.id}>
						{publicStory.favCount}
					</FavButton>
					<PagesIcon className="spaced">
						{publicStory.pageCount}
					</PagesIcon>
				</div>
				{open && (
					<div className="listing-section listing-blurb">
						<BBCode>{blurb}</BBCode>
					</div>
				)}
				<div className="listing-section listing-footer">
					{blurb && (
						<Link
							className="listing-more-link"
							onClick={toggleOpen}
						>
							{open ? 'Show Less' : 'Show More'}
						</Link>
					)}
					{blurb && !!publicStory.tags.length && ' - '}
					{publicStory.tags.map((tag, i) => (
						<Fragment key={tag}>
							{i !== 0 && ' '}
							<Link key={tag} className="tag">
								{`#${tag}`}
							</Link>
						</Fragment>
					))}
				</div>
			</div>
		</div>
	);
};

StoryListing.listClassName = 'story-list';

export default StoryListing;