import type { ClientPreviousPageIDs } from 'components/StoryViewer';
import { uniqBy } from 'lodash';
import { withErrorPage } from 'modules/client/errors';
import { Perm } from 'modules/client/perms';
import type { ClientStoryPage, PublicStory } from 'modules/client/stories';
import { StoryPrivacy } from 'modules/client/stories';
import { useUserCache } from 'modules/client/UserCache';
import type { PublicUser } from 'modules/client/users';
import { withStatusCode } from 'modules/server/errors';
import type { StoryPageID } from 'modules/server/stories';
import { getPublicStory, getStoryByUnsafeID, getClientPagesAround } from 'modules/server/stories';
import users, { getPublicUser } from 'modules/server/users';
import type { integer } from 'modules/types';
import dynamic from 'next/dynamic';

const Homepage = dynamic(() => import('components/Homepage'));
const StoryViewer = dynamic(() => import('components/StoryViewer'));

type ServerSideProps = {
	userCache?: never,
	publicStory?: never,
	pages?: never,
	previousPageIDs?: never
} | {
	userCache: PublicUser[],
	publicStory: PublicStory,
	pages: Record<StoryPageID, ClientStoryPage | null>,
	previousPageIDs: ClientPreviousPageIDs
} | {
	statusCode: integer
};

const Component = withErrorPage<ServerSideProps>(({
	userCache: initialUserCache,
	publicStory,
	pages,
	previousPageIDs
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
					previousPageIDs={previousPageIDs!}
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

	/** Whether the user is in preview mode (which allows accessing unpublished pages) and has permission to be in preview mode. */
	const previewMode = 'preview' in query;
	if (previewMode && !readPerms) {
		// The user does not have permission to be in preview mode.
		return { props: { statusCode: 403 } };
	}

	const { clientPages, clientPreviousPageIDs } = getClientPagesAround(story, pageID, previewMode);

	return {
		props: {
			userCache: await users.find!({
				_id: {
					$in: uniqBy([story.owner, ...story.editors], String)
				},
				willDelete: { $exists: false }
			}).map(getPublicUser).toArray(),
			publicStory: getPublicStory(story),
			pages: clientPages,
			// The reason this is sent to the client rather than having SSR and the client compute it a second time is as an optimization (and also it's simpler code).
			previousPageIDs: clientPreviousPageIDs
		}
	};
});