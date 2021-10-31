import './styles.module.scss';
import IconImage from 'components/IconImage';
import type { PublicStory } from 'lib/client/stories';
import Link from 'components/Link';
import { Fragment, useState } from 'react';
import useFunction from 'lib/client/useFunction';
import BBCode from 'components/BBCode';
import InconspicuousDiv from 'components/InconspicuousDiv';
import StoryTagLink from 'components/StoryTagLink';
import StoryStats from 'components/StoryStats';

export type StoryListingProps = {
	children: PublicStory
};

const StoryListing = ({ children: story }: StoryListingProps) => {
	const [open, setOpen] = useState(false);

	const toggleOpen = useFunction(() => {
		setOpen(open => !open);
	});

	return (
		<div className="listing">
			<Link
				className="listing-icon-container"
				href={`/?s=${story.id}&p=1`}
				title={story.title}
			>
				<IconImage
					className="listing-icon"
					src={story.icon}
					alt={`${story.title}'s Icon`}
				/>
			</Link>
			<div className="listing-info">
				<Link
					className="listing-title translucent"
					href={`/?s=${story.id}&p=1`}
					title={story.title}
				>
					{story.title}
				</Link>
				<StoryStats className="listing-section listing-details">
					{story}
				</StoryStats>
				{open && (
					<div className="listing-section listing-description">
						<BBCode>{story.description}</BBCode>
					</div>
				)}
				<InconspicuousDiv className="listing-section listing-footer">
					{story.description && (
						<Link
							className="listing-more-link"
							onClick={toggleOpen}
						>
							{open ? 'Show Less' : 'Show More'}
						</Link>
					)}
					{story.description && story.tags.length !== 0 && ' - '}
					{story.tags.map((tag, i) => (
						<Fragment key={tag}>
							{i !== 0 && ' '}
							<StoryTagLink>{tag}</StoryTagLink>
						</Fragment>
					))}
				</InconspicuousDiv>
			</div>
		</div>
	);
};

StoryListing.listClassName = 'story-list';

export default StoryListing;