import type { APIHandler } from 'modules/server/api';
import { Perm, permToGetUserInAPI } from 'modules/server/perms';
import users from 'modules/server/users';
import type { AuthMethod, ExternalAuthMethod, InternalAuthMethod } from 'modules/server/users';
import crypto from 'crypto';
import argon2 from 'argon2';
import { getExternalAuthMethodInfo } from 'modules/server/auth';
import validate from './index.validate';

export type ExternalAuthMethodOptions = Pick<ExternalAuthMethod, 'type' | 'value'>;
export type InternalAuthMethodOptions = Pick<InternalAuthMethod, 'type' | 'value'>;
export type AuthMethodOptions = ExternalAuthMethodOptions | InternalAuthMethodOptions;

export type ClientAuthMethod = Pick<AuthMethod, 'id' | 'type' | 'name'>;

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

	let authMethodValue: string | undefined;
	let authMethodName: string | undefined;

	if (req.body.type === 'password') {
		if (user.authMethods.some(({ type }) => type === 'password')) {
			res.status(422).send({
				message: 'Your account already has a password sign-in method.'
			});
			return;
		}

		authMethodValue = await argon2.hash(req.body.value);
	} else {
		({
			value: authMethodValue,
			name: authMethodName
		} = await getExternalAuthMethodInfo(req, res, req.body));
	}

	const authMethod = {
		id: crypto.createHash('sha1').update(req.body.type).update(authMethodValue).digest('hex'),
		type: req.body.type,
		value: authMethodValue,
		...authMethodName && {
			name: authMethodName
		}
	};

	if (user.authMethods.some(({ id }) => id === authMethod.id)) {
		res.status(422).send({
			message: 'Your account already has that sign-in method.'
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