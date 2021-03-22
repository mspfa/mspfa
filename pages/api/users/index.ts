import type { APIHandler } from 'modules/server/api';
import type { SessionBody } from 'pages/api/session';
import { checkExternalAuthMethod } from 'modules/server/auth';
import validate from './index.validate';

export type Request = {
	method: 'POST',
	body: SessionBody & {
		name: string
		// TODO: born
	}
};

export default (async (req, res) => {
	await validate(req, res);
	
	if (req.body.authMethod.type === 'password') {
		
	} else {
		const data = await checkExternalAuthMethod(req, res);
		
	}
}) as APIHandler<Request>;