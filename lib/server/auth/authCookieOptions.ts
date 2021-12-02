import type { SetOption } from 'cookies';

const authCookieOptions: SetOption = {
	sameSite: 'strict',
	domain: (
		process.env.NODE_ENV === 'development'
			// Let the cookie be saved outside `mspfa.com` (e.g. on `localhost`) if running in dev mode.
			? undefined
			: '.mspfa.com'
	),
	maxAge: 1000 * 60 * 60 * 24 * 7
};

export default authCookieOptions;