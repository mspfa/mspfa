import IconImage from 'components/IconImage';
import Link from 'components/Link';
import { useState } from 'react';
import useFunction from 'lib/client/reactHooks/useFunction';
import api from 'lib/client/api';
import type { APIClient } from 'lib/client/api';
import RemoveButton from 'components/Button/RemoveButton';
import Dialog from 'lib/client/Dialog';
import { useRouter } from 'next/router';
import type { PublicStory } from 'lib/client/stories';
import type { StoryID, StoryPageID } from 'lib/server/stories';
import StoryStats from 'components/StoryStats';

type UserStorySaveAPI = APIClient<typeof import('pages/api/users/[userID]/storySaves/[storyID]').default>;

export type StorySave = {
	id: StoryID,
	/** The story the user has a page ID saved for. Undefined if the user cannot access the story. */
	story?: PublicStory,
	/** The page ID the user has saved for the story. */
	pageID: StoryPageID
};

export type StorySaveListingProps = {
	removeListing: (storySave: StorySave) => void,
	children: StorySave
};

const StorySaveListing = ({
	removeListing,
	children: storySave
}: StorySaveListingProps) => {
	/** The ID of the user whose storySaves are being viewed. */
	const queriedUserID = useRouter().query.userID as string;

	const storyTitle = storySave.story ? storySave.story.title : '(Unavailable Adventure)';

	// This state is whether no actions should be performed on the storySave due to it currently loading.
	const [loading, setLoading] = useState(false);

	const confirmDeleteStorySave = useFunction(async () => {
		if (loading || !await Dialog.confirm({
			id: 'story-saves',
			title: 'Delete Game Data',
			content: (
				<>Are you sure you want to delete your save for the adventure <i>{storyTitle}</i>?</>
			)
		})) {
			return;
		}

		setLoading(true);

		await (api as UserStorySaveAPI).delete(`/users/${queriedUserID}/storySaves/${storySave.id}`).finally(() => {
			setLoading(false);
		});

		removeListing(storySave);
	});

	return (
		<div className="listing">
			<Link
				className="listing-icon-container"
				href={`/?s=${storySave.id}&p=${storySave.pageID}`}
				title={storyTitle}
			>
				<IconImage
					className="listing-icon"
					src={storySave.story?.icon}
					alt={`${storyTitle}'s Icon`}
				/>
			</Link>
			<div className="listing-info">
				<Link
					className="listing-title translucent"
					href={`/?s=${storySave.id}&p=${storySave.pageID}`}
					title={storyTitle}
				>
					{storyTitle}
				</Link>
				{storySave.story && (
					<StoryStats className="listing-section listing-details">
						{storySave.story}
					</StoryStats>
				)}
				<div className="listing-section listing-content">
					{`Saved on Page ${storySave.pageID}`}
				</div>
			</div>
			<div className="listing-actions">
				<RemoveButton
					title="Delete Game Data"
					onClick={confirmDeleteStorySave}
				/>
			</div>
		</div>
	);
};

StorySaveListing.listClassName = 'story-save-list';

export default StorySaveListing;