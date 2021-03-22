import type { APIHandler } from 'modules/server/api';
import type { ExternalAuthMethod, InternalAuthMethod } from 'modules/server/auth';
import { checkExternalAuthMethod } from 'modules/server/auth';
import Cookies from 'cookies';
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
		if (req.body.authMethod.type === 'password') {
			
		} else {
			const data = await checkExternalAuthMethod(req, res);
			console.log(data);
		}
	}
}) as APIHandler<Request>;