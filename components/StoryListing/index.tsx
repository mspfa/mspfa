import './styles.module.scss';
import IconImage from 'components/IconImage';
import type { PublicStory } from 'lib/client/stories';
import Link from 'components/Link';
import { Fragment, useState } from 'react';
import useFunction from 'lib/client/reactHooks/useFunction';
import BBCode from 'components/BBCode';
import InconspicuousDiv from 'components/InconspicuousDiv';
import StoryTagLink from 'components/StoryTagLink';
import StoryStats from 'components/StoryStats';
import type { StoryID } from 'lib/server/stories';
import { useUser } from 'lib/client/reactContexts/UserContext';
import FavButton from 'components/Button/FavButton';

/** A story to list as a `StoryListing`, or an object with only the ID of the story if the story is unavailable. */
export type ListedStory = PublicStory | { id: StoryID };

export type StoryListingProps = {
	children: ListedStory
};

const StoryListing = ({ children }: StoryListingProps) => {
	const storyID = children.id;
	let story;
	let storyTitle;
	if ('title' in children) {
		story = children;
		storyTitle = story.title;
	} else {
		storyTitle = '(Unavailable Adventure)';
	}

	const user = useUser();

	const [open, setOpen] = useState(false);

	const toggleOpen = useFunction(() => {
		setOpen(open => !open);
	});

	return (
		<div className="listing">
			<Link
				className="listing-icon-container"
				href={`/?s=${storyID}&p=1`}
				title={storyTitle}
			>
				<IconImage
					className="listing-icon"
					src={story?.icon}
					alt={`${storyTitle}'s Icon`}
				/>
			</Link>
			<div className="listing-info">
				<Link
					className="listing-title translucent"
					href={`/?s=${storyID}&p=1`}
					title={storyTitle}
				>
					{storyTitle}
				</Link>
				{story ? (
					<>
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
					</>
				) : user?.favs.includes(storyID) && (
					<FavButton storyID={storyID} />
				)}
			</div>
		</div>
	);
};

StoryListing.listClassName = 'story-list';

export default StoryListing;