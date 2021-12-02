import validate from './index.validate';
import type { APIHandler } from 'lib/server/api';
import { Perm } from 'lib/client/perms';
import { permToGetUserInAPI } from 'lib/server/users/permToGetUser';
import users from 'lib/server/users';
import updateFavCount from 'lib/server/stories/updateFavCount';
import getStoryByUnsafeID from 'lib/server/stories/getStoryByUnsafeID';
import StoryPrivacy from 'lib/client/StoryPrivacy';

const Handler: APIHandler<{
	query: {
		userID: string,
		storyID: string
	},
	method: 'PUT',
	/** `true` if the story should be favorited, or `false` if it should be unfavorited. */
	body: boolean
}> = async (req, res) => {
	await validate(req, res);

	const user = await permToGetUserInAPI(req, res, Perm.sudoWrite);

	const storyID = +req.query.storyID;
	const story = await getStoryByUnsafeID(storyID);

	// Check if this request would lead to any change.
	if (req.body !== user.favs.includes(storyID)) {
		// Do not allow favoriting a nonexistent story or a private story without permission. (Unfavoriting is fine.)
		if (req.body) {
			if (!story) {
				res.status(404).send({
					message: 'The specified story does not exist.'
				});
				return;
			}

			if (story.privacy === StoryPrivacy.Private && !(
				story.owner.equals(user._id)
				|| story.editors.some(userID => userID.equals(user._id))
				|| user.perms & Perm.sudoRead
			)) {
				res.status(403).send({
					message: 'The specified user does not have permission to favorite the specified story.'
				});
				return;
			}
		}

		await users.updateOne({
			_id: user._id
		}, {
			[req.body ? '$push' : '$pull']: {
				favs: storyID
			}
		});

		if (story) {
			await updateFavCount(storyID);
		}
	}

	res.status(204).end();
};

export default Handler;