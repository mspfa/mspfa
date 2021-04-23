import type { APIHandler } from 'modules/server/api';
import { Perm, permToGetUserInAPI } from 'modules/server/perms';
import type { AuthMethod } from 'modules/server/users';
import validate from './index.validate';

const Handler: APIHandler<{
	query: { userID: string },
	method: 'GET'
}, {
	body: Array<Pick<AuthMethod, 'type' | 'name'>>
}> = async (req, res) => {
	await validate(req, res);

	const user = await permToGetUserInAPI(req, res, req.query.userID, Perm.sudoRead);

	res.send(
		user.authMethods.map(({ type, name }) => ({
			type,
			name
		}))
	);
};

export default Handler;