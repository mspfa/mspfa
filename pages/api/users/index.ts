import type { APIHandler } from 'modules/server/api';
import type { SessionBody } from 'pages/api/session';
import { checkExternalAuthMethod, createSession } from 'modules/server/auth';
import users, { defaultUser } from 'modules/server/users';
import type { UserDocument } from 'modules/server/users';
import argon2 from 'argon2';
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
		email = (req.body as { email: UserDocument['email'] }).email.toLowerCase();
		authMethodValue = await argon2.hash(req.body.authMethod.value);
	} else {
		({ value: authMethodValue, email, verified } = await checkExternalAuthMethod(req, res));
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
	await users.insertOne(user);
	
	await createSession(req, res, user);
	
	res.status(200).send(user); // TODO: Sanitize user data
};

export default Handler;