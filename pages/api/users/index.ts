import type { APIHandler } from 'modules/server/api';
import type { Request as SessionRequest } from 'pages/api/session';
import { checkExternalAuthMethod } from 'modules/server/auth';
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
			const data = await checkExternalAuthMethod(req, res);
			
		}
	}
}) as APIHandler<Request>;