import validate from './index.validate';
import type { APIHandler } from 'modules/server/api';
import { verifyPassword } from 'modules/server/auth';
import { Perm } from 'modules/client/perms';
import { permToGetUserInAPI } from 'modules/server/perms';
import users from 'modules/server/users';
import type { PasswordString } from 'modules/server/users';
import argon2 from 'argon2';

const Handler: APIHandler<{
	query: {
		userID: string
	},
	method: 'PUT',
	body: {
		currentPassword: PasswordString,
		newPassword: PasswordString
	}
}> = async (req, res) => {
	await validate(req, res);

	const user = await permToGetUserInAPI(req, res, Perm.sudoWrite);

	await verifyPassword(res, user, req.body.currentPassword);

	await users.updateOne({
		'_id': user._id,
		'authMethods.type': 'password'
	}, {
		$set: {
			'authMethods.$.value': await argon2.hash(req.body.newPassword)
		}
	});

	res.end();
};

export default Handler;