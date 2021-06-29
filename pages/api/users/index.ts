import validate from './index.validate';
import { validateBirthdate } from 'modules/server/api';
import type { APIHandler } from 'modules/server/api';
import type { SessionBody } from 'pages/api/session';
import { getAuthMethodInfo, createSession } from 'modules/server/auth';
import users, { defaultUser, getPrivateUser, getPublicUser } from 'modules/server/users';
import type { UserDocument } from 'modules/server/users';
import { ObjectId } from 'mongodb';
import type { PrivateUser, PublicUser } from 'modules/client/users';
import axios from 'axios';
import { connection, safeObjectID } from 'modules/server/db';
import { escapeRegExp } from 'lodash';
import type { FilterQuery } from 'mongodb';

const Handler: APIHandler<(
	{
		method: 'POST',
		body: SessionBody & {
			/** @minLength 1 */
			captchaToken: string,
			name: UserDocument['name'],
			birthdate: number
		}
	} | {
		method: 'GET',
		query: {
			/** How many results to respond with. */
			limit?: number | string,
			/** A case-insensitive username search or exact user ID match. */
			search: UserDocument['name']
		}
	}
), (
	{
		method: 'POST',
		body: PrivateUser
	} | {
		method: 'GET',
		body: PublicUser[]
	}
)> = async (req, res) => {
	await validate(req, res);

	if (req.method === 'POST') {
		await validateBirthdate(res, req.body.birthdate);

		const {
			email = req.body.email?.toLowerCase(),
			verified,
			authMethod
		} = await getAuthMethodInfo(req, res, req.body.authMethod);

		if (
			authMethod.type !== 'password'
			&& await users.findOne({
				'authMethods.id': authMethod.id
			})
		) {
			res.status(422).send({
				message: 'The specified sign-in method is already taken.'
			});
			return;
		}

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

		const now = new Date();

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
		return;
	}

	// If this point is reached, `req.method === 'GET'`.

	await connection;

	let filterQuery: FilterQuery<UserDocument> = {
		name: {
			$regex: new RegExp(escapeRegExp(req.query.search), 'i')
		},
		willDelete: { $exists: false }
	};

	const userID = safeObjectID(req.query.search);

	if (userID) {
		filterQuery = {
			$or: [
				{ _id: userID },
				filterQuery
			],
			willDelete: { $exists: false }
		};
	}

	let results = (
		await users.find!(filterQuery).map(getPublicUser).toArray()
	).sort((a, b) => (
		// Sort by lowest search index first.
		a.name.indexOf(req.query.search) - b.name.indexOf(req.query.search)
		// If search indexes are equal, sort by last seen first.
		|| b.lastSeen - a.lastSeen
	));

	if (req.query.limit !== undefined) {
		const limit = +req.query.limit;

		if (!Number.isNaN(limit)) {
			results = results.slice(0, limit);
		}
	}

	res.send(results);
};

export default Handler;