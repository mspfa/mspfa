import validate from './index.validate';
import type { APIHandler } from 'lib/server/api';
import { Perm } from 'lib/client/perms';
import { permToGetUserInAPI } from 'lib/server/users/permToGetUser';
import users from 'lib/server/users';
import type { AuthMethod } from 'lib/server/users';
import type { AuthMethodOptions, ClientAuthMethod } from 'lib/client/auth';
import getAuthMethodInfo from 'lib/server/auth/getAuthMethodInfo';

const Handler: APIHandler<{
	query: {
		userID: string,
		type?: AuthMethod['type']
	}
} & (
	{
		method: 'GET'
	} | {
		method: 'POST',
		body: AuthMethodOptions
	}
), (
	{
		method: 'GET',
		body: ClientAuthMethod[]
	} | {
		method: 'POST',
		body: ClientAuthMethod
	}
)> = async (req, res) => {
	await validate(req, res);

	const user = await permToGetUserInAPI(req, res, Perm.sudoRead);

	if (req.method === 'GET') {
		let authMethods = user.authMethods.map(({ id, type, name }) => ({ id, type, name }));

		if (req.query.type) {
			authMethods = authMethods.filter(authMethod => authMethod.type === req.query.type);
		}

		res.send(authMethods);
		return;
	}

	// If this point is reached, `req.method === 'POST'`.

	if (
		req.body.type === 'password'
		&& user.authMethods.some(({ type }) => type === 'password')
	) {
		res.status(422).send({
			message: 'Your account already has a password.'
		});
		return;
	}

	const { authMethod } = await getAuthMethodInfo(req, res, req.body);

	if (user.authMethods.some(({ id }) => id === authMethod.id)) {
		res.status(422).send({
			message: 'Your account already has that sign-in method.'
		});
		return;
	}

	if (
		authMethod.type !== 'password'
		&& await users.findOne({
			'authMethods.id': authMethod.id
		})
	) {
		res.status(422).send({
			message: 'The specified sign-in method is already taken.'
		});
		return;
	}

	await users.updateOne({
		_id: user._id
	}, {
		$push: {
			authMethods: authMethod
		}
	});

	res.send(authMethod);
};

export default Handler;