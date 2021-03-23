import type { APIHandler, APIRequest } from 'modules/server/api';
import type { SessionBody } from 'pages/api/session';
import { checkExternalAuthMethod } from 'modules/server/auth';
import validate from './index.validate';

const Handler: APIHandler<{
	method: 'POST',
	body: SessionBody & {
		name: string
		// TODO: born
	}
}> = async (req: APIRequest<{ body: any }>, res) => {
	await validate(req, res);
	
	if (req.body.authMethod.type === 'password') {
		
	} else {
		const data = await checkExternalAuthMethod(req, res);
		
	}
};

export default Handler;