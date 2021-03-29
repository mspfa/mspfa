import axios from 'axios';
import crypto from 'crypto';
import argon2 from 'argon2';
import Cookies from 'cookies';
import { ObjectId } from 'bson';
import type { APIRequest, APIResponse } from 'modules/server/api';
import type { IncomingMessage, ServerResponse } from 'http';
import users from 'modules/server/users';
import type { UserDocument, UserSession } from 'modules/server/users';
import { OAuth2Client } from 'google-auth-library';

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

/**
 * Authenticate an auth method object with an external auth method.
 * 
 * If an error occurs, the promise returned by this function will never resolve.
 */
export const checkExternalAuthMethod = (
	req: APIRequest,
	res: APIResponse
): Promise<{
	value: string,
	email: string,
	verified: boolean
}> => new Promise(async resolve => {
	try {
		if (req.body.authMethod.type === 'google') {
			// Authenticate with Google.
			const ticket = await googleClient.verifyIdToken({
				idToken: req.body.authMethod.value,
				audience: process.env.GOOGLE_CLIENT_ID
			});
			const payload = ticket.getPayload()!;
			resolve({
				value: payload.sub,
				email: payload.email!,
				verified: payload.email_verified!
			});
			return;
		}
		
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
			code: req.body.authMethod.value,
			redirect_uri: `${referrerOrigin}/sign-in/discord`
		}));
		const { data: discordUser } = await axios.get('https://discord.com/api/users/@me', {
			headers: {
				Authorization: `${discordToken.token_type} ${discordToken.access_token}`
			}
		});
		resolve({
			value: discordUser.id,
			email: discordUser.email.toLowerCase(),
			verified: discordUser.verified
		});
	} catch (error) {
		console.error(error);
		res.status(error.status || 422).send({ message: error.message });
	}
});

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
 */
export const createSession = async (
	req: IncomingMessage,
	res: ServerResponse,
	/** The user which the session is for. */
	user: UserDocument
) => {
	const token = crypto.randomBytes(TOKEN_LENGTH).toString('base64');
	
	new Cookies(req, res).set('auth', `${user._id}:${token}`, authCookieOptions);
	
	const session: UserSession = {
		token: await argon2.hash(token),
		lastUsed: new Date()
	};
	if (typeof req.headers['x-real-ip'] === 'string') {
		session.ip = req.headers['x-real-ip'];
	}
	
	await users.updateOne({
		_id: user._id
	}, {
		$push: {
			sessions: session
		}
	});
	
	return session;
};

/**
 * Checks if the HTTP `Authorization` header or `auth` cookie represents a valid existing session.
 * 
 * Returns the authenticated user's `UserDocument` if so. Returns `undefined` if not.
 * 
 * Also updates the user's `lastSeen` and session `lastUsed` dates in the DB. The returned user data is from before this update.
 */
export const authenticate = async (req: IncomingMessage, res: ServerResponse) => {
	let cookies: Cookies | undefined;
	
	/** The auth credentials in the format `${userID}:${token}`, decoded from either the `Authorization` header or the `auth` cookie. */
	let credentials: string | undefined;
	
	/** The client's [HTTP `Authorization` header](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Authorization). */
	const authorization = req.headers.authorization;
	if (authorization && authorization.startsWith('Basic ')) {
		credentials = Buffer.from(authorization.slice(6), 'base64').toString();
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
						
						// Update the existing session in the DB.
						users.updateOne({
							_id: user._id,
							'sessions.token': session.token
						}, {
							$set: {
								lastSeen: new Date(),
								'sessions.$.lastUsed': new Date(),
								'sessions.$.ip': req.headers['x-real-ip']
							}
						});
						
						return user;
					}
				}
			}
		}
		
		if (cookies) {
			// Authentication failed but an `auth` cookie is set, so delete it.
			cookies.set('auth', undefined);
		}
	}
};