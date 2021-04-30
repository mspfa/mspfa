import type { APIHandler } from 'modules/server/api';
import users, { getPrivateUser } from 'modules/server/users';
import type { UserDocument } from 'modules/server/users';
import type { ExternalAuthMethodOptions, InternalAuthMethodOptions } from '../users/[userID]/authMethods';
import { authenticate, getExternalAuthMethodInfo, createSession, verifyPassword, VerifyPasswordResult } from 'modules/server/auth';
import Cookies from 'cookies';
import type { PrivateUser } from 'modules/client/users';
import type { EmailString } from 'modules/types';
import validate from './index.validate';

export type SessionBody = {
	authMethod: ExternalAuthMethodOptions,
	email?: never
} | {
	authMethod: InternalAuthMethodOptions,
	email: EmailString
};

const Handler: APIHandler<(
	{
		method: 'DELETE'
	} | {
		method: 'POST',
		body: SessionBody
	}
), {
	method: 'POST',
	body: PrivateUser
}> = async (req, res) => {
	await validate(req, res);

	if (req.method === 'POST') {
		let user: UserDocument | undefined | null;

		if (req.body.authMethod.type === 'password') {
			const email = req.body.email!.toLowerCase();

			user = await users.findOne({
				$or: [
					{ email },
					{ unverifiedEmail: email }
				]
			});

			if (!user) {
				res.status(404).send({
					message: 'No user was found with the specified email.'
				});
				return;
			}

			await verifyPassword(res, user, req.body.authMethod.value, {
				[VerifyPasswordResult.NotFound]: 401,
				[VerifyPasswordResult.Incorrect]: 401
			});
		} else {
			const { value: authMethodValue, name: authMethodName } = await getExternalAuthMethodInfo(req, res, req.body.authMethod);

			user = await users.findOne({
				authMethods: {
					$elemMatch: {
						type: req.body.authMethod.type,
						value: authMethodValue
					}
				}
			});

			if (!user) {
				res.status(404).send({
					message: 'No user was found with the specified sign-in method.'
				});
				return;
			}

			if ((
				user.authMethods.find(authMethod => authMethod.value = authMethodValue)
			)!.name !== authMethodName) {
				users.updateOne({
					'_id': user._id,
					'authMethods.value': authMethodValue
				}, {
					$set: {
						'authMethods.$.name': authMethodName
					}
				});
			}
		}

		// Authentication succeeded.

		const session = await createSession(req, res, user);

		res.status(session ? 201 : 403).send(getPrivateUser(user));
		return;
	}

	// If this point is reached, `req.method === 'DELETE'`.

	const { user, token } = await authenticate(req, res, false);

	if (user) {
		users.updateOne({
			_id: user._id
		}, {
			$pull: {
				sessions: {
					token
				}
			}
		});

		new Cookies(req, res).set('auth', undefined);

		res.end();
	} else {
		res.status(404).send({
			message: 'No valid user session was found to sign out of.'
		});
	}
};

export default Handler;