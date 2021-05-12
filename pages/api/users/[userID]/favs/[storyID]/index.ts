import validate from './index.validate';
import type { APIHandler } from 'modules/server/api';
import { Perm } from 'modules/client/perms';
import { permToGetUserInAPI } from 'modules/server/perms';
import users from 'modules/server/users';

const Handler: APIHandler<{
	query: {
		userID: string,
		storyID: string
	},
	method: 'DELETE'
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

	res.end();
};

export default Handler;