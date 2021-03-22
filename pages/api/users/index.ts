import type { APIHandler } from 'modules/server/api';
import { checkExternalAuthMethod } from 'modules/server/auth';
import type { Request as SessionRequest } from 'pages/api/session';
import validate from './index.validate';

export type Request = {
	method: 'POST',
	body: SessionRequest['body'] & {
		name: string
		// TODO: born
	}
};

export default (async (req, res) => {
	await validate(req, res);
	
	if (req.method === 'POST') {
		if (req.body.authMethod.type === 'password') {
			
		} else {
			await checkExternalAuthMethod(req, res);
			
		}
	}
}) as APIHandler<Request>;