import type { APIHandler } from 'modules/server/api';
import type { SessionBody } from 'pages/api/session';
import { createSession } from 'pages/api/session';
import { checkExternalAuthMethod } from 'modules/server/auth';
import users, { defaultUser } from 'modules/server/users';
import type { UserDocument, UserSession } from 'modules/server/users';
import argon2 from 'argon2';
import Cookies from 'cookies';
import validate from './index.validate';

const Handler: APIHandler<{
	method: 'POST',
	body: SessionBody & {
		name: UserDocument['name'],
		birthdate: number
	}
}> = async (req, res) => {
	await validate(req, res);
	const cookies = new Cookies(req, res);

	let email: string;
	let verified = false;
	let authMethodValue: string;
	
	if (req.body.authMethod.type === 'password') {
		email = (req.body as any).email;
		authMethodValue = await argon2.hash(req.body.authMethod.value);
	} else {
		const data = await checkExternalAuthMethod(req, res);
		authMethodValue = data.id;
		email = data.email;
		verified = data.verified;
	}
	
	const session: UserSession = {
		token: await createSession(cookies),
		lastUsed: new Date()
	};
	if (typeof req.headers['x-real-ip'] === 'string') {
		session.ip = req.headers['x-real-ip'];
	}
	
	const user = (await users.insertOne({
		...defaultUser,
		authMethods: [{
			type: req.body.authMethod.type,
			value: authMethodValue
		}],
		sessions: [session],
		created: new Date(),
		lastSeen: new Date(),
		birthdate: new Date(req.body.birthdate),
		name: req.body.name,
		email,
		verified
	})).ops[0];
};

export default Handler;