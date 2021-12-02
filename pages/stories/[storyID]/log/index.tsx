import './styles.module.scss';
import { withErrorPage } from 'lib/client/errors';
import { Perm } from 'lib/client/perms';
import type { PublicStory, StoryLogListings } from 'lib/client/stories';
import StoryPrivacy from 'lib/client/StoryPrivacy';
import withStatusCode from 'lib/server/withStatusCode';
import { getPublicStory } from 'lib/server/stories';
import getStoryByUnsafeID from 'lib/server/stories/getStoryByUnsafeID';
import type { integer } from 'lib/types';
import StoryLog from 'components/StoryLog';
import Page from 'components/Page';
import Section from 'components/Section';
import Link from 'components/Link';
import { useMemo } from 'react';
import { useRouter } from 'next/router';
import useFunction from 'lib/client/reactHooks/useFunction';
import { preventLeaveConfirmations } from 'lib/client/forms';
import PreviewModeContext from 'lib/client/reactContexts/PreviewModeContext';
import StoryIDContext from 'lib/client/reactContexts/StoryIDContext';
import Row from 'components/Row';
import Button from 'components/Button';

type ServerSideProps = {
	story: PublicStory,
	listings: StoryLogListings
} | {
	statusCode: integer
};

const Component = withErrorPage<ServerSideProps>(({ story, listings }) => {
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

	const previewMode = 'preview' in router.query;

	const pageComponent = (
		<Page withFlashyTitle heading="Adventure Log">
			<Section heading={story.title}>
				<Row id="story-log-actions">
					<Button
						className="small"
						href={`/?s=${story.id}`}
					>
						Back to Adventure
					</Button>
				</Row>
				<StoryLog listings={sortedListings}>
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
			</Section>
		</Page>
	);

	return (
		<StoryIDContext.Provider value={story.id}>
			<PreviewModeContext.Provider value={previewMode}>
				{pageComponent}
			</PreviewModeContext.Provider>
		</StoryIDContext.Provider>
	);
});

export default Component;

export const getServerSideProps = withStatusCode<ServerSideProps>(async ({ req, params, query }) => {
	const story = await getStoryByUnsafeID(params.storyID);

	if (!story) {
		return { props: { statusCode: 404 } };
	}

	const previewMode = 'preview' in query;

	if ((
		previewMode
		|| story.privacy === StoryPrivacy.Private
	) && !(
		req.user && (
			story.owner.equals(req.user._id)
			|| story.editors.some(userID => userID.equals(req.user!._id))
			|| req.user.perms & Perm.sudoRead
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
			story: getPublicStory(story),
			listings
		}
	};
});