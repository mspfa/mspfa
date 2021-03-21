import axios from 'axios';
import type { APIRequest, APIResponse } from './api';
import { OAuth2Client } from 'google-auth-library';

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

export type ExternalAuthMethod = {
	type: 'google' | 'discord',
	value: string
};

export type AuthMethod = ExternalAuthMethod | {
	type: 'password',
	value: string,
	/** Whether the password was created on the old site. */
	legacy?: true
};

/**
 * Authenticate an auth method object with an external auth method.
 * 
 * If an error occurs, the promise returned by this function will never resolve.
 */
export const checkExternalAuthMethod = async (authMethod: ExternalAuthMethod, req: APIRequest, res: APIResponse): Promise<{
	id: string,
	email: string,
	verified: boolean
}> => {
	try {
		if (authMethod.type === 'google') {
			// Authenticate with Google.
			const ticket = await googleClient.verifyIdToken({
				idToken: authMethod.value,
				audience: process.env.GOOGLE_CLIENT_ID
			});
			const payload = ticket.getPayload()!;
			return {
				id: payload.sub,
				email: payload.email!,
				verified: payload.email_verified!
			};
		}
		
		// Authenticate with Discord.
		const referrerOrigin = req.headers.referer?.slice(0, `${req.headers.referer}/`.indexOf('/', req.headers.referer.indexOf('//') + 2));
		const response = await axios.post('https://discord.com/api/oauth2/token', new URLSearchParams({
			client_id: process.env.DISCORD_CLIENT_ID!,
			client_secret: process.env.DISCORD_CLIENT_SECRET!,
			grant_type: 'authorization_code',
			code: authMethod.value,
			redirect_uri: `${referrerOrigin}/sign-in/discord`
		}), {
			headers: {
				'Content-Type': 'application/x-www-form-urlencoded'
			}
		});
		const { data } = await axios.get('https://discord.com/api/users/@me', {
			method: 'GET',
			headers: {
				Authorization: `${response.data.token_type} ${response.data.access_token}`
			}
		});
		return {
			id: data.id,
			email: data.email,
			verified: data.verified
		};
	} catch (error) {
		res.status(422).send({ message: error.message });
		await new Promise(() => {});
		return undefined as never;
	}
};