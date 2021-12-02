import argon2 from 'argon2';
import Cookies from 'cookies';
import { ObjectId } from 'mongodb';
import type { IncomingMessage, ServerResponse } from 'http';
import users from 'lib/server/users';
import type { ServerUser } from 'lib/server/users';
import authCookieOptions from 'lib/server/auth/authCookieOptions';

/**
 * Checks if the HTTP `Authorization` header or `auth` cookie represents a valid existing session.
 *
 * Also optionally updates the user's `lastSeen` and session `lastUsed` dates in the DB. The returned user data is from before this update.
 */
const authenticate = async (
	req: IncomingMessage,
	res: ServerResponse,
	/** Whether this should update the user's `lastSeen` and session `lastUsed` dates in the DB. */
	updateDB = true
): Promise<{
	/** The authenticated user. */
	user?: ServerUser,
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

export default authenticate;