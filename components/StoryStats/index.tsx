import EditButton from 'components/Button/EditButton';
import FavButton from 'components/Button/FavButton';
import PageCount from 'components/StoryStats/PageCount';
import Perm, { hasPerms } from 'lib/client/Perm';
import type { PublicStory } from 'lib/client/stories';
import { storyStatusNames } from 'lib/client/StoryStatus';
import { useUser } from 'lib/client/reactContexts/UserContext';
import type { StoryPageID } from 'lib/server/stories';
import React from 'react';
import classes from 'lib/client/classes';

export type StoryStatsProps = {
	children: PublicStory,
	className?: string,
	/** The page ID that the edit button should link to. */
	editPageID?: StoryPageID | null
};

/** A `div` with a story's status, edit button, fav button, and page count. */
const StoryStats = ({
	children: story,
	className,
	editPageID
}: StoryStatsProps) => {
	const [user] = useUser();

	return (
		<div
			className={classes('story-stats', className)}
		>
			<span className="story-status spaced">
				{storyStatusNames.get(story.status)}
			</span>
			{user && (
				story.owner === user.id
				|| story.editors.includes(user.id)
				|| hasPerms(user, Perm.WRITE)
			) && (
				<EditButton
					className="spaced"
					href={`/stories/${story.id}/edit/pages${editPageID ? `#p${editPageID}` : ''}`}
					title="Edit Adventure"
				/>
			)}
			<FavButton
				className="spaced"
				storyID={story.id}
			>
				{story.favCount}
			</FavButton>
			<PageCount className="spaced">
				{story.pageCount}
			</PageCount>
		</div>
	);
};

export default StoryStats;
