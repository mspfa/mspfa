import type { integer } from 'lib/types';
import type { StoryID } from 'lib/server/stories';
import stories from 'lib/server/stories';
import users from 'lib/server/users';

/** Updates the specified story's `favCount`. Returns the new `favCount` value. */
const updateFavCount = async (storyID: StoryID) => {
	const favCount = (
		await users.aggregate!<{ favCount: integer }>([
			{ $match: { favs: storyID } },
			{ $count: 'favCount' }
		]).next()
	)?.favCount || 0;

	await stories.updateOne({
		_id: storyID
	}, {
		$set: { favCount }
	});

	return favCount;
};

export default updateFavCount;