import StoryPrivacy from 'lib/client/StoryPrivacy';
import stories, { getPublicStory } from 'lib/server/stories';
import type { ServerUser } from 'lib/server/users';

/** Gets all the public stories owned or edited by a user. */
const getPublicStoriesByEditor = async (editor: ServerUser) => (
	stories.find!({
		privacy: StoryPrivacy.Public,
		$or: [{
			owner: editor._id
		}, {
			editors: editor._id
		}],
		willDelete: { $exists: false }
	}).map(getPublicStory).toArray()
);

export default getPublicStoriesByEditor;