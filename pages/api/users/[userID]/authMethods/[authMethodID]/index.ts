import type { APIHandler } from 'modules/server/api';
import { Perm, permToGetUserInAPI } from 'modules/server/perms';
import users from 'modules/server/users';
import validate from './index.validate';

const Handler: APIHandler<{
	query: {
		userID: string,
		authMethodID: string
	},
	method: 'DELETE'
}> = async (req, res) => {
	await validate(req, res);

	const user = await permToGetUserInAPI(req, res, req.query.userID, Perm.sudoWrite);

	if (user.authMethods.length <= 1) {
		res.status(422).send({
			message: 'You cannot remove your only sign-in method. How would you sign in without any sign-in methods?'
		});
		return;
	}

	await users.deleteOne({
		'_id': user._id,
		'authMethods.id': req.query.authMethodID
	});

	res.end();
};

export default Handler;