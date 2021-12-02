import crypto from 'crypto';
import argon2 from 'argon2';
import Cookies from 'cookies';
import type { APIRequest, APIResponse } from 'lib/server/api';
import type { ServerUser, UserSession } from 'lib/server/users';
import users from 'lib/server/users';
import authCookieOptions from 'lib/server/auth/authCookieOptions';

/** The number of random bytes in newly generated session tokens. */
const TOKEN_LENGTH = 64;

/**
 * Sets the client's `auth` cookie to new session data which is pushed to the `user`'s `sessions` in the database.
 *
 * Returns a `UserSession` of the new session data.
 *
 * If the user is not verified, returns `undefined`.
 */
const createSession = async (
	req: APIRequest,
	res: APIResponse,
	/** The user which the session is for. */
	user: ServerUser
) => {
	if (!user.email) {
		// The user is not verified, so session should be created.
		return;
	}

	const token = crypto.randomBytes(TOKEN_LENGTH).toString('base64');

	new Cookies(req, res).set(
		'auth',
		`${user._id}:${token}`,
		authCookieOptions
	);

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

export default createSession;