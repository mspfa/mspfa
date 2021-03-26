import type { APIHandler, APIRequest } from 'modules/server/api';
import type { ExternalAuthMethod, InternalAuthMethod } from 'modules/server/users';
import { checkExternalAuthMethod } from 'modules/server/auth';
import Cookies from 'cookies';
import validate from './index.validate';

export type SessionBody = {
	authMethod: ExternalAuthMethod
} | {
	email: string,
	authMethod: Pick<InternalAuthMethod, 'type' | 'value'>
};

const Handler: APIHandler<(
	{
		method: 'DELETE',
		body: undefined
	} | {
		method: 'POST',
		body: SessionBody
	}
)> = async (req: APIRequest<{ body: any }>, res) => {
	await validate(req, res);
	const cookies = new Cookies(req, res);
	
	if (req.method === 'POST') {
		if (req.body.authMethod.type === 'password') {
			
		} else {
			const data = await checkExternalAuthMethod(req, res);
			
		}
	}
};

export default Handler;