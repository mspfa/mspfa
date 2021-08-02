import { PAGE_PRELOAD_DEPTH } from 'components/StoryViewer';
import { uniqBy } from 'lodash';
import { withErrorPage } from 'modules/client/errors';
import { Perm } from 'modules/client/perms';
import type { ClientStoryPage, PublicStory } from 'modules/client/stories';
import { StoryPrivacy } from 'modules/client/stories';
import { useUserCache } from 'modules/client/UserCache';
import type { PublicUser } from 'modules/client/users';
import { withStatusCode } from 'modules/server/errors';
import type { ServerStoryPage, StoryPageID } from 'modules/server/stories';
import { getClientStoryPage, getPublicStory, getStoryByUnsafeID } from 'modules/server/stories';
import users, { getPublicUser } from 'modules/server/users';
import dynamic from 'next/dynamic';

const Homepage = dynamic(() => import('components/Homepage'));
const StoryViewer = dynamic(() => import('components/StoryViewer'));

type ServerSideProps = {
	userCache?: never,
	publicStory?: never,
	pages?: never
} | {
	userCache: PublicUser[],
	publicStory: PublicStory,
	pages: Record<StoryPageID, ClientStoryPage | null>
} | {
	statusCode: number
};

const Component = withErrorPage<ServerSideProps>(({
	userCache: initialUserCache,
	publicStory,
	pages
}) => {
	const { cacheUser } = useUserCache();
	initialUserCache?.forEach(cacheUser);

	return (
		publicStory
			? (
				<StoryViewer
					// This key is to make the `StoryViewer`'s states not preserve between different stories.
					key={publicStory.id}
					story={publicStory}
					pages={pages!}
				/>
			)
			: <Homepage />
	);
});

export default Component;

export const getServerSideProps = withStatusCode<ServerSideProps>(async ({ req, query }) => {
	if (typeof query.s !== 'string') {
		// Load the `Homepage`.

		return { props: {} };
	}

	// Load the `StoryViewer`.

	const story = await getStoryByUnsafeID(query.s);

	if (!story) {
		return { props: { statusCode: 404 } };
	}

	const readPerms = (
		!!req.user && (
			story.owner.equals(req.user._id)
			|| story.editors.some(userID => userID.equals(req.user!._id))
			|| !!(req.user.perms & Perm.sudoRead)
		)
	);

	if (story.privacy === StoryPrivacy.Private && !readPerms) {
		return { props: { statusCode: 403 } };
	}

	const pageID = (
		typeof query.p === 'string'
			? +query.p
			: 1
	);

	/**
	 * A record of pages to send to the client.
	 *
	 * If a page ID maps to `null`, then the page does not exist to the client, letting the client know not to try to request it.
	 */
	const clientPages: Record<StoryPageID, ClientStoryPage | null> = {};

	const now = Date.now();

	/** Whether this user is in preview mode (which shows unpublished pages) and has permission to be in preview mode. */
	const previewMode = 'preview' in query && readPerms;

	/** Adds pages to `clientPages`, doing the same for their `nextPages` recursively until the recursion depth reaches the `PAGE_PRELOAD_DEPTH`. */
	const addToClientPages = (
		/** The the ID of the page to add to `clientPages`. */
		pageID: StoryPageID,
		/** The recursion depth of this function call. */
		depth: number
	) => {
		// If this page is already added, then don't continue.
		if (pageID in clientPages) {
			return;
		}

		// This is asserted as nullable because `pageID` may not index a real page.
		const serverPage = story.pages[pageID] as ServerStoryPage | undefined;

		// If this page doesn't exist or the user doesn't have access to it, then set it to `null` and don't continue.
		if (!serverPage || (
			!previewMode && (
				// Check if this page is not public.
				serverPage.published === undefined || +serverPage.published > now
			)
		)) {
			clientPages[pageID] = null;
			return;
		}

		const clientPage = getClientStoryPage(story.pages[pageID]);

		// Add the `clientPage` to `clientPages`.
		clientPages[pageID] = clientPage;

		if (++depth > PAGE_PRELOAD_DEPTH) {
			// If this iteration has reached the `PAGE_PRELOAD_DEPTH`, don't iterate any deeper.
			return;
		}

		// Call this function of each of this page's `nextPages` as well.
		for (const nextPageID of clientPage.nextPages) {
			addToClientPages(nextPageID, depth);
		}
	};

	addToClientPages(pageID, 0);

	return {
		props: {
			userCache: await users.find!({
				_id: {
					$in: uniqBy([story.owner, ...story.editors], String)
				},
				willDelete: { $exists: false }
			}).map(getPublicUser).toArray(),
			publicStory: getPublicStory(story),
			pages: clientPages
		}
	};
});