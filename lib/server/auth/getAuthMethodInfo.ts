import crypto from 'crypto';
import argon2 from 'argon2';
import axios from 'axios';
import { OAuth2Client } from 'google-auth-library';
import type { AuthMethodOptions } from 'lib/client/auth';
import type { EmailString } from 'lib/types';
import type { APIRequest, APIResponse } from '../api';
import type { AuthMethod } from '../users';

const googleClient = new OAuth2Client(process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID);

export type AuthMethodInfo<
	AuthMethodType extends AuthMethod['type'] = AuthMethod['type']
> = {
	authMethod: AuthMethod & (
		AuthMethod['type'] extends AuthMethodType
			? unknown
			: { type: AuthMethodType }
	),
	email?: EmailString,
	verified: boolean
};

/**
 * Gets information about a user's auth method. Authenticates it if it's external.
 *
 * If an error occurs, never resolves.
 */
const getAuthMethodInfo = async <AuthMethodType extends AuthMethod['type'] = AuthMethod['type']>(
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
				audience: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID
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
				client_id: process.env.NEXT_PUBLIC_DISCORD_CLIENT_ID!,
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
			...name && { name }
		},
		email,
		verified
	};
};

export default getAuthMethodInfo;