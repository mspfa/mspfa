import './styles.module.scss';
import { withErrorPage } from 'lib/client/errors';
import { Perm } from 'lib/client/perms';
import type { PublicStory, StoryLogListings } from 'lib/client/stories';
import { StoryPrivacy } from 'lib/client/stories';
import { withStatusCode } from 'lib/server/errors';
import { getPublicStory, getStoryByUnsafeID } from 'lib/server/stories';
import type { integer } from 'lib/types';
import StoryLog from 'components/StoryLog';
import Page from 'components/Page';
import Box from 'components/Box';
import BoxSection from 'components/Box/BoxSection';
import Link from 'components/Link';
import { useNavStoryID } from 'components/Nav';
import { useMemo } from 'react';
import { useRouter } from 'next/router';
import useFunction from 'lib/client/useFunction';
import { preventLeaveConfirmations } from 'lib/client/forms';

type ServerSideProps = {
	publicStory: PublicStory,
	listings: StoryLogListings
} | {
	statusCode: integer
};

const Component = withErrorPage<ServerSideProps>(({ publicStory, listings }) => {
	useNavStoryID(publicStory.id);

	const router = useRouter();

	const sortMode = (
		router.query.sort === 'oldest'
			? 'oldest' as const
			// Default to `'newest'` for invalid query params.
			: 'newest' as const
	);

	const sortedListings = useMemo(() => (
		sortMode === 'newest'
			? listings
			: [...listings].reverse()
	), [listings, sortMode]);

	return (
		<Page withFlashyTitle heading="Adventure Log">
			<Box>
				<BoxSection heading={publicStory.title}>
					<StoryLog
						story={publicStory}
						listings={sortedListings}
					>
						<Link
							id="story-log-sort-link"
							onClick={
								useFunction(() => {
									const url = new URL(location.href);
									url.searchParams.set('sort', sortMode === 'newest' ? 'oldest' : 'newest');
									preventLeaveConfirmations();
									router.replace(url, undefined, { shallow: true });
								})
							}
						>
							{sortMode === 'newest' ? 'View oldest to newest' : 'View newest to oldest'}
						</Link>
					</StoryLog>
				</BoxSection>
			</Box>
		</Page>
	);
});

export default Component;

export const getServerSideProps = withStatusCode<ServerSideProps>(async ({ req, params, query }) => {
	const story = await getStoryByUnsafeID(params.storyID);

	if (!story) {
		return { props: { statusCode: 404 } };
	}

	/** Whether the user is in preview mode (which allows accessing unpublished pages) and has permission to be in preview mode. */
	const previewMode = 'preview' in query;

	if ((
		previewMode
		|| story.privacy === StoryPrivacy.Private
	) && !(
		req.user && (
			story.owner.equals(req.user._id)
			|| story.editors.some(userID => userID.equals(req.user!._id))
			|| (req.user.perms & Perm.sudoRead)
		)
	)) {
		return { props: { statusCode: 403 } };
	}

	const listings: StoryLogListings = [];

	for (
		let pageID = (
			previewMode
				? Object.values(story.pages).length
				: story.pageCount
		);
		pageID > 0;
		pageID--
	) {
		const page = story.pages[pageID];

		if (!page.unlisted) {
			listings.push({
				id: pageID,
				...page.published !== undefined && {
					published: +page.published
				},
				title: page.title
			});
		}
	}

	return {
		props: {
			publicStory: getPublicStory(story),
			listings
		}
	};
});