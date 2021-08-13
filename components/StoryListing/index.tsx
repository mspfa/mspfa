import './styles.module.scss';
import IconImage from 'components/IconImage';
import type { PublicStory } from 'lib/client/stories';
import { storyStatusNames } from 'lib/client/stories';
import Link from 'components/Link';
import FavButton from 'components/Button/FavButton';
import EditButton from 'components/Button/EditButton';
import { useUser } from 'lib/client/users';
import { Perm } from 'lib/client/perms';
import PageCount from 'components/Icon/PageCount';
import { Fragment, useState } from 'react';
import useFunction from 'lib/client/useFunction';
import BBCode from 'components/BBCode';
import StoryTagLinkContainer from 'components/StoryTagLink/StoryTagLinkContainer';
import StoryTagLink from 'components/StoryTagLink';

export type StoryListingProps = {
	children: PublicStory
};

const StoryListing = ({ children: publicStory }: StoryListingProps) => {
	const user = useUser();
	const [open, setOpen] = useState(false);

	const toggleOpen = useFunction(() => {
		setOpen(open => !open);
	});

	return (
		<div className="listing">
			<Link
				className="listing-icon-container"
				href={`/?s=${publicStory.id}&p=1`}
				title={publicStory.title}
			>
				<IconImage
					className="listing-icon"
					src={publicStory.icon}
					alt={`${publicStory.title}'s Icon`}
				/>
			</Link>
			<div className="listing-info">
				<Link
					className="listing-title translucent"
					href={`/?s=${publicStory.id}&p=1`}
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
					<PageCount className="spaced">
						{publicStory.pageCount}
					</PageCount>
				</div>
				{open && (
					<div className="listing-section listing-description">
						<BBCode>{publicStory.description}</BBCode>
					</div>
				)}
				<StoryTagLinkContainer className="listing-section listing-footer">
					{publicStory.description && (
						<Link
							className="listing-more-link"
							onClick={toggleOpen}
						>
							{open ? 'Show Less' : 'Show More'}
						</Link>
					)}
					{publicStory.description && !!publicStory.tags.length && ' - '}
					{publicStory.tags.map((tag, i) => (
						<Fragment key={tag}>
							{i !== 0 && ' '}
							<StoryTagLink>{tag}</StoryTagLink>
						</Fragment>
					))}
				</StoryTagLinkContainer>
			</div>
		</div>
	);
};

StoryListing.listClassName = 'story-list';

export default StoryListing;