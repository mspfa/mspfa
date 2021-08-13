import validate from './index.validate';
import type { APIHandler } from 'lib/server/api';
import { Perm } from 'lib/client/perms';
import { permToGetUserInAPI } from 'lib/server/perms';
import users from 'lib/server/users';
import type { ServerStory } from 'lib/server/stories';
import { updateAndSendFavCount } from 'lib/server/stories';

const Handler: APIHandler<{
	query: {
		userID: string,
		storyID: string
	},
	method: 'DELETE'
}, {
	body: {
		favCount: ServerStory['favCount']
	}
}> = async (req, res) => {
	await validate(req, res);

	const storyID = +req.query.storyID;

	const user = await permToGetUserInAPI(req, res, Perm.sudoWrite);

	if (!user.favs.some(fav => fav === storyID)) {
		res.status(404).send({
			message: 'That adventure is not in your favorites.'
		});
		return;
	}

	await users.updateOne({
		_id: user._id
	}, {
		$pull: {
			favs: storyID
		}
	});

	await updateAndSendFavCount(res, storyID);
};

export default Handler;