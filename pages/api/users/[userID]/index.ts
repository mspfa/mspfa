import validate from './index.validate';
import type { APIHandler } from 'modules/server/api';
import { validateBirthdate } from 'modules/server/api';
import type { PrivateUser } from 'modules/client/users';
import type { RecursivePartial } from 'modules/types';
import { Perm } from 'modules/client/perms';
import { permToGetUserInAPI } from 'modules/server/perms';
import users, { getPrivateUser } from 'modules/server/users';
import type { UserDocument } from 'modules/server/users';
import { flatten } from 'modules/server/db';
import _ from 'lodash';

/** The keys of all `PrivateUser` properties which the client should be able to `PUT` into their `UserDocument`. */
type PuttableUserKeys = 'birthdate' | 'name' | 'email' | 'description' | 'icon' | 'site' | 'profileStyle' | 'settings';

const Handler: APIHandler<{
	query: {
		userID: string
	}
} & (
	{
		method: 'DELETE'
	} | {
		method: 'PUT',
		body: RecursivePartial<Pick<PrivateUser, PuttableUserKeys>>
	}
), {
	method: 'PUT',
	body: PrivateUser
}> = async (req, res) => {
	await validate(req, res);

	if (req.method === 'PUT') {
		const user = await permToGetUserInAPI(req, res, Perm.sudoWrite);

		if (Object.keys(req.body).length) {
			const userChanges: RecursivePartial<(
				Omit<UserDocument, 'birthdate'>
				& { birthdate: Date }
			)> = req.body as Omit<typeof req.body, 'birthdate'>;

			if (req.body.birthdate !== undefined) {
				await validateBirthdate(res, req.body.birthdate);

				userChanges.birthdate = new Date(req.body.birthdate);
			}

			await users.updateOne({
				_id: user._id
			}, {
				$set: flatten(userChanges)
			});

			_.merge(user, userChanges);
		}

		res.send(getPrivateUser(user));
		return;
	}

	// If this point is reached, `req.method === 'DELETE'`.

	const user = await permToGetUserInAPI(req, res, Perm.sudoDelete);

	await users.updateOne({
		_id: user._id
	}, {
		$set: {
			willDelete: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30),
			sessions: []
		}
	});

	res.end();
};

export default Handler;