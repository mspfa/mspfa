import type { APIHandler } from 'modules/server/api';
import type { SessionBody } from 'pages/api/session';
import { createSession } from 'pages/api/session';
import { checkExternalAuthMethod } from 'modules/server/auth';
import users, { defaultUser } from 'modules/server/users';
import type { UserDocument, UserSession } from 'modules/server/users';
import argon2 from 'argon2';
import Cookies from 'cookies';
import { ObjectId } from 'bson';
import validate from './index.validate';

const Handler: APIHandler<{
	method: 'POST',
	body: SessionBody & {
		name: UserDocument['name'],
		birthdate: number
	}
}> = async (req, res) => {
	await validate(req, res);

	let email: string;
	let verified = false;
	let authMethodValue: string;
	
	if (req.body.authMethod.type === 'password') {
		email = (req.body as { email: string }).email.toLowerCase();
		authMethodValue = await argon2.hash(req.body.authMethod.value);
	} else {
		const data = await checkExternalAuthMethod(req, res);
		authMethodValue = data.id;
		email = data.email.toLowerCase();
		verified = data.verified;
	}
	
	if (await users.findOne({
		email
	})) {
		res.status(422).send({
			message: 'The specified email is already taken.'
		});
		return;
	}
	
	const user: UserDocument = {
		...defaultUser,
		_id: new ObjectId(),
		authMethods: [{
			type: req.body.authMethod.type,
			value: authMethodValue
		}],
		sessions: [],
		created: new Date(),
		lastSeen: new Date(),
		birthdate: new Date(req.body.birthdate),
		name: req.body.name,
		email,
		verified
	};
	
	const session: UserSession = {
		token: await createSession(user, new Cookies(req, res)),
		lastUsed: new Date()
	};
	if (typeof req.headers['x-real-ip'] === 'string') {
		session.ip = req.headers['x-real-ip'];
	}
	user.sessions.push(session);
	
	await users.insertOne(user);
	
	res.status(200).end();
};

export default Handler;