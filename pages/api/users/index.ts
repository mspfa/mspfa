import type { APIHandler } from 'modules/server/api';
import type { SessionBody } from 'pages/api/session';
import { checkExternalAuthMethod, createSession } from 'modules/server/auth';
import users, { defaultUser, getClientUser } from 'modules/server/users';
import type { UserDocument } from 'modules/server/users';
import argon2 from 'argon2';
import { ObjectId } from 'bson';
import validate from './index.validate';
import type { ClientUser } from 'modules/client/users';

const Handler: APIHandler<{
	method: 'POST',
	body: SessionBody & {
		name: UserDocument['name'],
		birthdate: number
	}
}, (
	{
		method: 'POST',
		body: ClientUser
	}
)> = async (req, res) => {
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
	
	if (await users.findOne({ email })) {
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
		created: new Date(),
		lastSeen: new Date(),
		birthdate: new Date(req.body.birthdate),
		name: req.body.name,
		email,
		verified
	};
	await users.insertOne(user);
	
	await createSession(req, res, user);
	
	res.status(200).send(getClientUser(user));
};

export default Handler;