import type { APIHandler } from 'modules/server/api';
import validate from './index.validate';
import type { AuthMethod, checkExternalAuthMethod } from 'modules/server/auth';

export type Request = {
	method: 'POST',
	body: {
		authMethod: AuthMethod,
		email?: string
	}
};

export default (async (req, res) => {
	await validate(req, res);
	if (req.method === 'POST') {
		
	}
}) as APIHandler<Request>;