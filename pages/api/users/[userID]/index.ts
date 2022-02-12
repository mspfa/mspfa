import validate from './index.validate';
import type { APIHandler } from 'lib/server/api';
import validateBirthdate from 'lib/server/validateBirthdate';
import type { PrivateUser, PublicUser } from 'lib/client/users';
import type { RecursivePartial } from 'lib/types';
import { Perm } from 'lib/client/perms';
import { permToGetUserInAPI } from 'lib/server/users/permToGetUser';
import users, { getPrivateUser, getPublicUser } from 'lib/server/users';
import getUserByUnsafeID from 'lib/server/users/getUserByUnsafeID';
import type { ServerUser } from 'lib/server/users';
import flatten from 'lib/server/db/flatten';
import { mergeWith } from 'lodash';
import stories from 'lib/server/stories';
import overwriteArrays from 'lib/client/overwriteArrays';

/** The keys of all `PrivateUser` properties which a client should be able to `PATCH` into a `ServerUser`. */
type WritableUserKey = 'birthdate' | 'name' | 'email' | 'description' | 'icon' | 'site' | 'profileStyle' | 'settings';

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
		method: 'PATCH',
		body: RecursivePartial<Pick<PrivateUser, WritableUserKey>>
	}
), (
	{
		method: 'GET',
		body: PublicUser
	} | {
		method: 'PATCH',
		body: PrivateUser
	}
)> = async (req, res) => {
	await validate(req, res);

	if (req.method === 'GET') {
		const user = await getUserByUnsafeID(req.query.userID, res);

		res.send(getPublicUser(user));
		return;
	}

	if (req.method === 'PATCH') {
		const user = await permToGetUserInAPI(req, res, Perm.sudoWrite);

		if (Object.values(req.body).length) {
			const userChanges: RecursivePartial<ServerUser> = req.body as Omit<typeof req.body, 'birthdate'>;

			if (req.body.birthdate !== undefined) {
				if (user.birthdateChanged) {
					res.status(422).send({
						message: 'A user\'s birthdate can only be changed once.'
					});
					return;
				}

				await validateBirthdate(res, req.body.birthdate);

				userChanges.birthdate = new Date(req.body.birthdate);
				userChanges.birthdateChanged = true;
			}

			if (req.body.email !== undefined) {
				if (await users.findOne({
					$or: [
						{ email: req.body.email },
						{ unverifiedEmail: req.body.email }
					]
				})) {
					res.status(422).send({
						message: 'The specified email is taken.'
					});
					return;
				}

				// TODO: Handle email changing.
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
		owner: user._id,
		willDelete: { $exists: false }
	})) {
		res.status(422).send({
			message: 'Users who own adventures cannot be deleted.'
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

	res.status(204).end();
};

export default Handler;