import type { APIHandler } from 'modules/server/api';
import { Perm, permToGetUserInAPI } from 'modules/server/perms';
import type { AuthMethod } from 'modules/server/users';
import validate from './index.validate';

const Handler: APIHandler<{
	query: {
		userID: string,
		type?: AuthMethod['type']
	},
	method: 'GET'
}, {
	body: Array<Pick<AuthMethod, 'type' | 'name'>>
}> = async (req, res) => {
	await validate(req, res);

	const user = await permToGetUserInAPI(req, res, req.query.userID, Perm.sudoRead);

	let authMethods = user.authMethods.map(({ type, name }) => ({ type, name }));

	if (req.query.type) {
		authMethods = authMethods.filter(authMethod => authMethod.type === req.query.type);
	}

	res.send(authMethods);
};

export default Handler;