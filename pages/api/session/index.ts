import type { APIHandler } from 'modules/server/api';
import type { ExternalAuthMethod, InternalAuthMethod, UserDocument } from 'modules/server/users';
import { checkExternalAuthMethod } from 'modules/server/auth';
import Cookies from 'cookies';
import crypto from 'crypto';
import argon2 from 'argon2';
import validate from './index.validate';

/** Takes a `Cookies` object which is used to set the session cookie. Returns the hashed token string. */
export const createSession = async (user: UserDocument, cookies: Cookies) => {
	const token = crypto.randomBytes(100).toString('base64');
	const authorization = `Basic ${Buffer.from(`${user._id}:${token}`).toString('base64')}`;
	cookies.set(
		'auth',
		authorization,
		{
			sameSite: 'strict',
			maxAge: 1000 * 60 * 60 * 24 * 7
		}
	);
	return argon2.hash(token);
};

export type SessionBody = {
	authMethod: ExternalAuthMethod
} | {
	email: UserDocument['email'],
	authMethod: Pick<InternalAuthMethod, 'type' | 'value'>
};

const Handler: APIHandler<(
	{
		method: 'DELETE',
		body: undefined
	} | {
		method: 'POST',
		body: SessionBody
	}
)> = async (req, res) => {
	await validate(req, res);
	const cookies = new Cookies(req, res);
	
	if (req.method === 'POST') {
		if (req.body.authMethod.type === 'password') {
			
		} else {
			const data = await checkExternalAuthMethod(req, res);
			
		}
	}
};

export default Handler;