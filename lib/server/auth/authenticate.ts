import argon2 from 'argon2';
import Cookies from 'cookies';
import type { IncomingMessage, ServerResponse } from 'node:http';
import users from 'lib/server/users';
import type { ServerUser, ServerUserID } from 'lib/server/users';
import authCookieOptions from 'lib/server/auth/authCookieOptions';
import parseID from 'lib/server/db/parseID';

export type Credentials = {
	/** The cookies the credentials came from, or undefined if they didn't come from cookies. */
	cookies?: Cookies,
	/** A Base64-encoded string representing the credentials. */
	encodedString: string,
	userID: ServerUserID,
	token: string
};

/**
 * Gets the user's (unverified) ID and token from the request's `Authorization` header or `auth` cookie.
 *
 * Returns `undefined` if the credentials are in an invalid format.
 */
export const getCredentials = (
	req: IncomingMessage,
	res: ServerResponse
): Credentials | undefined => {
	let cookies: Cookies | undefined;
	let encodedString: Credentials['encodedString'] | undefined;

	if (req.headers.authorization) {
		if (req.headers.authorization.startsWith('Basic ')) {
			encodedString = req.headers.authorization.slice('Basic '.length);
		}
	} else {
		cookies = new Cookies(req, res);
		encodedString = cookies.get('auth');
	}

	if (!encodedString) {
		return;
	}

	const decodedString = Buffer.from(encodedString, 'base64').toString();

	const [userIDString, token, ...invalidParts] = decodedString.split(':');

	if (invalidParts.length !== 0) {
		return;
	}

	const userID = parseID(userIDString);

	if (!userID) {
		return;
	}

	return { cookies, encodedString, userID, token };
};

/**
 * Returns the user authenticated by the specified credentials if the credentials are correct.
 *
 * Otherwise, returns `undefined` and deletes the client's `auth` cookie (if the `auth` cookie is where the credentials came from).
 */
export const verifyCredentials = async ({
	cookies,
	userID,
	token
}: Credentials): Promise<ServerUser | undefined> => {
	const user = await users.findOne({
		_id: userID
	});

	if (!user) {
		// Authentication failed, so delete the `auth` cookie.
		cookies?.set('auth', undefined);

		return;
	}

	for (const session of user.sessions) {
		if (!await argon2.verify(session.token, token)) {
			continue;
		}

		return user;
	}
};

/**
 * Returns the user authenticated by the request's `Authorization` header or `auth` cookie (updating its expiration accordingly).
 *
 * If no user is authenticated, returns `undefined` and deletes the client's `auth` cookie (if the `auth` cookie is where the credentials came from).
 *
 * Also updates the user's `lastSeen` and session `lastUsed` dates in the DB. The returned user data is from before this update.
 */
const authenticate = async (
	req: IncomingMessage,
	res: ServerResponse
): Promise<ServerUser | undefined> => {
	const credentials = getCredentials(req, res);

	if (!credentials) {
		return;
	}

	const user = await verifyCredentials(credentials);

	if (!user) {
		return;
	}

	// Update the `auth` cookie's expiration date.
	credentials.cookies?.set('auth', credentials.encodedString, authCookieOptions);

	// Update the existing session in the DB.
	users.updateOne({
		'_id': user._id,
		'sessions.token': credentials.token
	}, {
		$set: {
			'lastSeen': new Date(),
			'sessions.$.lastUsed': new Date(),
			'sessions.$.ip': req.headers['x-real-ip']
		}
	});

	return user;
};

export default authenticate;
