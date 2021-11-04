import { Perm } from 'lib/client/perms';
import { withErrorPage } from 'lib/client/errors';
import { withStatusCode } from 'lib/server/errors';
import { getClientStoryPage, getPrivateStory, getStoryByUnsafeID } from 'lib/server/stories';
import type { ClientStoryPageRecord } from 'lib/client/stories';
import type { integer } from 'lib/types';
import type { StoryPageEditorProps } from 'components/StoryPageEditor';
import StoryPageEditor from 'components/StoryPageEditor';

type ServerSideProps = StoryPageEditorProps | {
	statusCode: integer
};

const Component = withErrorPage<ServerSideProps>(StoryPageEditor);

export default Component;

export const getServerSideProps = withStatusCode<ServerSideProps>(async ({ req, params }) => {
	const story = await getStoryByUnsafeID(params.storyID);

	if (!(
		story && req.user && (
			story.owner.equals(req.user._id)
			|| story.editors.some(userID => userID.equals(req.user!._id))
			|| req.user.perms & Perm.sudoRead
		)
	)) {
		return { props: { statusCode: 403 } };
	}

	const clientPages: ClientStoryPageRecord = {};

	for (const page of Object.values(story.pages)) {
		clientPages[page.id] = getClientStoryPage(page);
	}

	return {
		props: {
			story: getPrivateStory(story),
			pages: clientPages
		}
	};
});