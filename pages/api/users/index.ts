import validate from './index.validate';
import type { APIHandler } from 'modules/server/api';
import type { SessionBody } from 'pages/api/session';
import { getAuthMethodInfo, createSession } from 'modules/server/auth';
import users, { defaultUser, getPrivateUser } from 'modules/server/users';
import type { UserDocument } from 'modules/server/users';
import { ObjectId } from 'bson';
import type { PrivateUser } from 'modules/client/users';
import axios from 'axios';

const Handler: APIHandler<{
	method: 'POST',
	body: SessionBody & {
		/** @minLength 1 */
		captchaToken: string,
		name: UserDocument['name'],
		birthdate: number
	}
}, {
	method: 'POST',
	body: PrivateUser
}> = async (req, res) => {
	await validate(req, res);

	const now = new Date();
	if (req.body.birthdate > +new Date(now.getFullYear() - 13, now.getMonth(), now.getDate())) {
		// The user is under 13 years old, which breaks the terms of service.
		res.status(400).send({
			message: 'You must be at least 13 years old to sign up.'
		});
		return;
	}

	if (req.body.birthdate < +new Date(now.getFullYear() - 1000, now.getMonth(), now.getDate())) {
		// The user is over 1000 years old, which, as far as I know, is currently impossible.
		res.status(400).send({
			message: 'You should be dead.'
		});
		return;
	}

	const {
		email = req.body.email?.toLowerCase(),
		verified,
		authMethod
	} = await getAuthMethodInfo(req, res, req.body.authMethod);

	if (await users.findOne({
		$or: [
			{ email },
			{ unverifiedEmail: email }
		]
	})) {
		res.status(422).send({
			message: 'The specified email is already taken.'
		});
		return;
	}

	if (!(
		await axios.post('https://hcaptcha.com/siteverify', new URLSearchParams({
			secret: process.env.HCAPTCHA_SECRET_KEY!,
			sitekey: process.env.HCAPTCHA_SITE_KEY!,
			response: req.body.captchaToken,
			...typeof req.headers['x-real-ip'] === 'string' && {
				remoteip: req.headers['x-real-ip']
			}
		}))
	).data.success) {
		res.status(422).send({
			message: 'Your CAPTCHA token is invalid. Please try again.'
		});
		return;
	}

	const user: UserDocument = {
		...defaultUser,
		_id: new ObjectId(),
		authMethods: [authMethod],
		created: now,
		lastSeen: now,
		birthdate: new Date(req.body.birthdate),
		name: req.body.name,
		[verified ? 'email' : 'unverifiedEmail']: email
	};

	await users.insertOne(user);

	const session = await createSession(req, res, user);

	res.status(session ? 201 : 403).send(getPrivateUser(user));
};

export default Handler;