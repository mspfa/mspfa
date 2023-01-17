import argon2 from 'argon2';
import Cookies from 'cookies';
import type { IncomingMessage, ServerResponse } from 'node:http';
import users from 'lib/server/users';
import type { ServerUser } from 'lib/server/users';
import authCookieOptions from 'lib/server/auth/authCookieOptions';
import parseID from 'lib/server/db/parseID';

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

	if (req.headers.authorization) {
		if (req.headers.authorization.startsWith('Basic ')) {
			credentials = Buffer.from(req.headers.authorization.slice(6), 'base64').toString();
		}
	} else {
		cookies = new Cookies(req, res);
		credentials = cookies.get('auth');
	}

	if (credentials) {
		const [userIDString, token, ...invalidParts] = credentials.split(':');

		if (invalidParts.length === 0) {
			const userID = parseID(userIDString);

			const user = userID && await users.findOne({
				_id: userID
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
