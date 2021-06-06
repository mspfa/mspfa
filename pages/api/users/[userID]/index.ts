import validate from './index.validate';
import type { APIHandler } from 'modules/server/api';
import { validateBirthdate } from 'modules/server/api';
import type { PrivateUser, PublicUser } from 'modules/client/users';
import type { RecursivePartial } from 'modules/types';
import { Perm } from 'modules/client/perms';
import { permToGetUserInAPI } from 'modules/server/perms';
import users, { getPrivateUser, getPublicUser, getUserByUnsafeID } from 'modules/server/users';
import type { UserDocument } from 'modules/server/users';
import { flatten } from 'modules/server/db';
import { mergeWith } from 'lodash';
import stories from 'modules/server/stories';
import { overwriteArrays } from 'modules/client/utilities';

/** The keys of all `PrivateUser` properties which the client should be able to `PUT` into their `UserDocument`. */
type PuttableUserKey = 'birthdate' | 'name' | 'email' | 'description' | 'icon' | 'site' | 'profileStyle' | 'settings';

const Handler: APIHandler<{
	query: {
		userID: string
	}
} & (
	{
		method: 'GET'
	} | {
		method: 'DELETE'
	} | {
		method: 'PUT',
		body: RecursivePartial<Pick<PrivateUser, PuttableUserKey>>
	}
), (
	{
		method: 'GET',
		body: PublicUser
	} | {
		method: 'PUT',
		body: PrivateUser
	}
)> = async (req, res) => {
	await validate(req, res);

	if (req.method === 'GET') {
		const user = await getUserByUnsafeID(req.query.userID, res);

		res.send(getPublicUser(user));
		return;
	}

	if (req.method === 'PUT') {
		const user = await permToGetUserInAPI(req, res, Perm.sudoWrite);

		if (Object.keys(req.body).length) {
			const userChanges: RecursivePartial<UserDocument> = req.body as Omit<typeof req.body, 'birthdate'>;

			if (req.body.birthdate !== undefined) {
				await validateBirthdate(res, req.body.birthdate);

				userChanges.birthdate = new Date(req.body.birthdate);
			}

			await users.updateOne({
				_id: user._id
			}, {
				$set: flatten(userChanges)
			});

			mergeWith(user, userChanges, overwriteArrays);
		}

		res.send(getPrivateUser(user));
		return;
	}

	// If this point is reached, `req.method === 'DELETE'`.

	const user = await permToGetUserInAPI(req, res, Perm.sudoDelete);

	if (await stories.findOne({
		editors: user._id
	})) {
		res.status(422).send({
			message: 'Users with adventures cannot be deleted.'
		});
		return;
	}

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