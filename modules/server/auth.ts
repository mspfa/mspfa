import axios from 'axios';
import crypto from 'crypto';
import argon2 from 'argon2';
import Cookies from 'cookies';
import { ObjectId } from 'mongodb';
import type { APIRequest, APIResponse } from 'modules/server/api';
import type { IncomingMessage, ServerResponse } from 'http';
import users from 'modules/server/users';
import type { UserDocument, UserSession, AuthMethod } from 'modules/server/users';
import { OAuth2Client } from 'google-auth-library';
import type { EmailString } from 'modules/types';
import type { AuthMethodOptions } from 'modules/client/auth';

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

export type AuthMethodInfo<AuthMethodType extends AuthMethod['type'] = AuthMethod['type']> = {
	authMethod: AuthMethod & (
		AuthMethod['type'] extends AuthMethodType
			? unknown
			: { type: AuthMethodType }
	),
	email?: EmailString,
	verified: boolean
};

/**
 * Get information about an auth method. Authenticate it if it is external.
 *
 * If an error occurs, this function will never resolve.
 */
export const getAuthMethodInfo = async <AuthMethodType extends AuthMethod['type'] = AuthMethod['type']>(
	req: APIRequest,
	res: APIResponse,
	authMethodOptions: AuthMethodOptions & (
		AuthMethod['type'] extends AuthMethodType
			? unknown
			: { type: AuthMethodType }
	)
): Promise<AuthMethodInfo<AuthMethodType>> => {
	let value: AuthMethod['value'];
	let email: AuthMethodInfo['email'];
	let verified: AuthMethodInfo['verified'] = false;
	let name: AuthMethod['name'];

	if (authMethodOptions.type === 'password') {
		value = await argon2.hash(authMethodOptions.value);
	} else {
		const onReject = (error: any) => new Promise<never>(() => {
			res.status(error.status || 422).send({
				message: error.message
			});
		});

		if (authMethodOptions.type === 'google') {
			// Authenticate with Google.

			const ticket = await googleClient.verifyIdToken({
				idToken: authMethodOptions.value,
				audience: process.env.GOOGLE_CLIENT_ID
			}).catch(onReject);

			const payload = ticket.getPayload()!;

			value = payload.sub;
			email = payload.email!.toLowerCase();
			verified = payload.email_verified!;
			name = payload.email;
		} else {
			// Authenticate with Discord.

			const referrerOrigin = req.headers.referer?.slice(
				0,
				// This is the index of end of the origin in the `Referer` header. For example, the index of the single "/" in "https://example.com/path".
				`${req.headers.referer}/`.indexOf('/', req.headers.referer.indexOf('//') + 2)
			);

			const { data: discordToken } = await axios.post('https://discord.com/api/oauth2/token', new URLSearchParams({
				client_id: process.env.DISCORD_CLIENT_ID!,
				client_secret: process.env.DISCORD_CLIENT_SECRET!,
				grant_type: 'authorization_code',
				code: authMethodOptions.value,
				redirect_uri: `${referrerOrigin}/sign-in/discord`
			})).catch(onReject);

			const { data: discordUser } = await axios.get('https://discord.com/api/users/@me', {
				headers: {
					Authorization: `${discordToken.token_type} ${discordToken.access_token}`
				}
			}).catch(onReject);

			value = discordUser.id;
			email = discordUser.email.toLowerCase();
			verified = discordUser.verified;
			name = discordUser.email;
		}
	}

	return {
		authMethod: {
			id: crypto.createHash('sha1').update(authMethodOptions.type).update(value).digest('hex'),
			type: authMethodOptions.type,
			value,
			...name && {
				name
			}
		},
		email,
		verified
	};
};

const authCookieOptions = {
	sameSite: 'strict',
	maxAge: 1000 * 60 * 60 * 24 * 7
} as const;

/** The number of random bytes in newly generated tokens. */
const TOKEN_LENGTH = 64;

/**
 * Sets the `auth` cookie to new session data which is pushed to the user's sessions in the DB.
 *
 * Returns a `UserSession` of that session data.
 *
 * If the user is not verified, sends an error response (to be handled on the client) and returns `undefined`.
 */
export const createSession = async (
	req: APIRequest,
	res: APIResponse,
	/** The user which the session is for. */
	user: UserDocument
) => {
	if (!user.email) {
		// The user is not verified. No session should be created.

		return undefined;
	}

	const token = crypto.randomBytes(TOKEN_LENGTH).toString('base64');

	new Cookies(req, res).set('auth', `${user._id}:${token}`, authCookieOptions);

	const session: UserSession = {
		token: await argon2.hash(token),
		lastUsed: new Date(),
		...typeof req.headers['x-real-ip'] === 'string' && {
			ip: req.headers['x-real-ip']
		}
	};

	await users.updateOne({
		_id: user._id
	}, {
		$push: {
			sessions: session
		},
		$unset: {
			willDelete: true
		}
	});

	return session;
};

/**
 * Checks if the HTTP `Authorization` header or `auth` cookie represents a valid existing session.
 *
 * Also optionally updates the user's `lastSeen` and session `lastUsed` dates in the DB. The returned user data is from before this update.
 */
export const authenticate = async (
	req: IncomingMessage,
	res: ServerResponse,
	/** Whether this should update the user's `lastSeen` and session `lastUsed` dates in the DB. */
	updateDB = true
): Promise<{
	/** The authenticated user. */
	user?: UserDocument,
	/** The authenticated user's hashed session token. */
	token?: string
}> => {
	let cookies: Cookies | undefined;

	/** The auth credentials in the format `${userID}:${token}`, decoded from either the `Authorization` header or the `auth` cookie. */
	let credentials: string | undefined;

	if (req.headers.authorization && req.headers.authorization.startsWith('Basic ')) {
		credentials = Buffer.from(req.headers.authorization.slice(6), 'base64').toString();
	} else {
		cookies = new Cookies(req, res);
		credentials = cookies.get('auth');
	}

	if (credentials) {
		const match = /^([^:]+):([^:]+)$/.exec(credentials);

		if (match) {
			const [, userID, token] = match;

			const user = await users.findOne({
				_id: new ObjectId(userID)
			});

			if (user) {
				for (const session of user.sessions) {
					if (await argon2.verify(session.token, token)) {
						// Authentication succeeded.

						if (cookies) {
							// An `auth` cookie is set, so update its expiration date.
							cookies.set('auth', credentials, authCookieOptions);
						}

						if (updateDB) {
							// Update the existing session in the DB.
							users.updateOne({
								'_id': user._id,
								'sessions.token': session.token
							}, {
								$set: {
									'lastSeen': new Date(),
									'sessions.$.lastUsed': new Date(),
									'sessions.$.ip': req.headers['x-real-ip']
								}
							});
						}

						return {
							user,
							token: session.token
						};
					}
				}
			}
		}

		if (cookies) {
			// Authentication failed but an `auth` cookie is set, so delete it.
			cookies.set('auth', undefined);
		}
	}

	return {
		user: undefined,
		token: undefined
	};
};

export enum VerifyPasswordResult {
	NotFound,
	Correct,
	Incorrect
}

export const verifyPassword = (
	res: APIResponse,
	/** The user to verify the password of. */
	user: UserDocument,
	/** The user-inputted password to verify. */
	password: string,
	/**
	 * A partial record of `VerifyPasswordResult` keys to HTTP status code values.
	 *
	 * If a value is 0, the corresponding `VerifyPasswordResult` will resolve this promise rather than sending an HTTP error.
	 */
	status: Partial<Record<Exclude<VerifyPasswordResult, VerifyPasswordResult.Correct>, number>> = {}
) => new Promise<VerifyPasswordResult>(async resolve => {
	let result = VerifyPasswordResult.NotFound;

	for (const authMethod of user.authMethods) {
		if (authMethod.type === 'password') {
			result = VerifyPasswordResult.Incorrect;

			if (await argon2.verify(authMethod.value, password)) {
				result = VerifyPasswordResult.Correct;
				break;
			}
		}
	}

	if (result === VerifyPasswordResult.NotFound) {
		const resultStatus = status[VerifyPasswordResult.NotFound] ?? 404;

		if (resultStatus !== 0) {
			res.status(resultStatus).send({
				message: 'The specified user does not use a password to sign in.'
			});
			return;
		}
	}

	if (result === VerifyPasswordResult.Incorrect) {
		const resultStatus = status[VerifyPasswordResult.NotFound] ?? 403;

		if (resultStatus !== 0) {
			res.status(resultStatus).send({
				message: 'The specified password is incorrect.'
			});
			return;
		}
	}

	resolve(result);
});