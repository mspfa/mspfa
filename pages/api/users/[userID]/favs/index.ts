import validate from './index.validate';
import type { APIHandler } from 'modules/server/api';
import { Perm } from 'modules/client/perms';
import { permToGetUserInAPI } from 'modules/server/perms';
import users from 'modules/server/users';
import type { StoryDocument, StoryID } from 'modules/server/stories';
import { getStoryByUnsafeID, updateAndSendFavCount } from 'modules/server/stories';

const Handler: APIHandler<{
	query: {
		userID: string
	},
	method: 'POST',
	body: {
		storyID: StoryID
	}
}, {
	body: {
		favCount: StoryDocument['favCount']
	}
}> = async (req, res) => {
	await validate(req, res);

	const user = await permToGetUserInAPI(req, res, Perm.sudoWrite);

	// Ensure the story exists before favoriting it.
	await getStoryByUnsafeID(req.body.storyID, res);

	if (user.favs.some(fav => fav === req.body.storyID)) {
		res.status(422).send({
			error: 'ALREADY_EXISTS',
			message: 'That adventure is already in your favorites.'
		});
		return;
	}

	await users.updateOne({
		_id: user._id
	}, {
		$push: {
			favs: req.body.storyID
		}
	});

	await updateAndSendFavCount(res, req.body.storyID);
};

export default Handler;