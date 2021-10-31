import IconImage from 'components/IconImage';
import Link from 'components/Link';
import { useState } from 'react';
import useFunction from 'lib/client/useFunction';
import api from 'lib/client/api';
import type { APIClient } from 'lib/client/api';
import RemoveButton from 'components/Button/RemoveButton';
import Dialog from 'lib/client/Dialog';
import { useRouter } from 'next/router';
import type { PublicStory } from 'lib/client/stories';
import { storyStatusNames } from 'lib/client/stories';
import type { StoryID, StoryPageID } from 'lib/server/stories';
import { useUser } from 'lib/client/users';
import { Perm } from 'lib/client/perms';
import EditButton from 'components/Button/EditButton';
import FavButton from 'components/Button/FavButton';
import PageCount from 'components/Icon/PageCount';

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
	const user = useUser();

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
					<div className="listing-section listing-details">
						<span className="listing-status spaced">
							{storyStatusNames[storySave.story.status]}
						</span>
						{user && (
							storySave.story.owner === user.id
							|| storySave.story.editors.includes(user.id)
							|| !!(user.perms & Perm.sudoRead)
						) && (
							<EditButton
								className="spaced"
								href={`/s/${storySave.id}/edit/p`}
								title="Edit Adventure"
							/>
						)}
						<FavButton className="spaced" storyID={storySave.id}>
							{storySave.story.favCount}
						</FavButton>
						<PageCount className="spaced">
							{storySave.story.pageCount}
						</PageCount>
					</div>
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