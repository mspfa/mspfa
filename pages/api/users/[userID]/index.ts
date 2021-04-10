import type { APIHandler } from 'modules/server/api';
import users, { getPrivateUser } from 'modules/server/users';
import type { UserDocument } from 'modules/server/users';
import { checkExternalAuthMethod, createSession } from 'modules/server/auth';
import argon2 from 'argon2';
import type { PrivateUser } from 'modules/client/users';
import type { RecursivePartial } from 'modules/types';
import validate from './index.validate';

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
		let user: UserDocument | undefined | null;



		// res.status(200).send(getPrivateUser(user));
	}
};

export default Handler;