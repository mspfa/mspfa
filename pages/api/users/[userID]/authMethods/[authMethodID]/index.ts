import validate from './index.validate';
import type { APIHandler } from 'lib/server/api';
import { Perm } from 'lib/client/perms';
import { permToGetUserInAPI } from 'lib/server/users/permToGetUser';
import users from 'lib/server/users';

const Handler: APIHandler<{
	query: {
		userID: string,
		authMethodID: string
	},
	method: 'DELETE'
}> = async (req, res) => {
	await validate(req, res);

	const user = await permToGetUserInAPI(req, res, Perm.sudoWrite);

	if (user.authMethods.length <= 1) {
		res.status(422).send({
			message: 'You cannot remove your only sign-in method. How would you sign in without any sign-in methods?'
		});
		return;
	}

	await users.updateOne({
		_id: user._id
	}, {
		$pull: {
			authMethods: {
				id: req.query.authMethodID
			}
		}
	});

	res.status(204).end();
};

export default Handler;