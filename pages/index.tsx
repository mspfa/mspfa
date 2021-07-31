import { uniqBy } from 'lodash';
import { withErrorPage } from 'modules/client/errors';
import { Perm } from 'modules/client/perms';
import type { PublicStory } from 'modules/client/stories';
import { StoryPrivacy } from 'modules/client/stories';
import type { PublicUser } from 'modules/client/users';
import { withStatusCode } from 'modules/server/errors';
import { getPublicStory, getStoryByUnsafeID } from 'modules/server/stories';
import users, { getPublicUser } from 'modules/server/users';
import dynamic from 'next/dynamic';

const Homepage = dynamic(() => import('components/Homepage'));
const StoryViewer = dynamic(() => import('components/StoryViewer'));

type ServerSideProps = {
	publicStory?: never,
	userCache?: never
} | {
	publicStory: PublicStory,
	userCache: PublicUser[]
} | {
	statusCode: number
};

const Component = withErrorPage<ServerSideProps>(({ publicStory }) => (
	publicStory
		? <StoryViewer story={publicStory} />
		: <Homepage />
));

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

	if (story.privacy === StoryPrivacy.Private && !(
		req.user && (
			story.owner.equals(req.user._id)
			|| story.editors.some(userID => userID.equals(req.user!._id))
			|| req.user.perms & Perm.sudoRead
		)
	)) {
		return { props: { statusCode: 403 } };
	}

	return {
		props: {
			publicStory: getPublicStory(story),
			userCache: await users.find!({
				_id: {
					$in: uniqBy([story.owner, ...story.editors], String)
				},
				willDelete: { $exists: false }
			}).map(getPublicUser).toArray()
		}
	};
});