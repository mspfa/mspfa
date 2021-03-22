import type { APIHandler } from 'modules/server/api';
import Cookies from 'cookies';
import type { ExternalAuthMethod, InternalAuthMethod } from 'modules/server/auth';
import validate from './index.validate';

export type Request = {
	method: 'POST',
	body: {
		authMethod: ExternalAuthMethod
	} | {
		email: string,
		authMethod: InternalAuthMethod
	}
};

export default (async (req, res) => {
	await validate(req, res);
	const cookies = new Cookies(req, res);
	
	if (req.method === 'POST') {
		
	}
}) as APIHandler<Request>;