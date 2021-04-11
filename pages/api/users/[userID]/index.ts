import type { APIHandler } from 'modules/server/api';
import type { PrivateUser } from 'modules/client/users';
import type { RecursivePartial } from 'modules/types';
import { Perm, permToGetUserInAPI } from 'modules/server/perms';
import users, { getPrivateUser } from 'modules/server/users';
import validate from './index.validate';
import { flatten } from 'modules/server/db';

/** The keys of all `PrivateUser` properties which the client should be able to `PUT` into their `UserDocument`. */
type PuttableUserKeys = 'birthdate' | 'name' | 'email' | 'description' | 'icon' | 'site' | 'profileStyle' | 'settings' | 'nameColor';

const Handler: APIHandler<(
	{
		method: 'DELETE'
	} | {
		method: 'PUT',
		body: RecursivePartial<Pick<PrivateUser, PuttableUserKeys>>
	}
), (
	{ body: PrivateUser }
)> = async (req, res) => {
	await validate(req, res);

	if (req.method === 'PUT') {
		const user = await permToGetUserInAPI(req, res, req.query.userID as string, Perm.sudoWrite);

		if (Object.keys(req.body).length) {
			users.updateOne({
				_id: user._id
			}, {
				$set: flatten({
					...req.body as Omit<typeof req.body, 'birthdate'>,
					...(
						req.body.birthdate ? {
							birthdate: new Date(req.body.birthdate)
						} : {}
					)
				})
			});
		}

		res.status(200).send(getPrivateUser(user));
	}
};

export default Handler;