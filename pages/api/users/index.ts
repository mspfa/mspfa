import type { APIHandler } from 'modules/server/api';
import type { SessionBody } from 'pages/api/session';
import { checkExternalAuthMethod } from 'modules/server/auth';
import users from 'modules/server/users';
import type { UserDocument } from 'modules/server/users';
import validate from './index.validate';

const Handler: APIHandler<{
	method: 'POST',
	body: SessionBody & {
		name: UserDocument['name'],
		birthdate: number
	}
}> = async (req, res) => {
	await validate(req, res);
	
	if (req.body.authMethod.type === 'password') {
		
	} else {
		const data = await checkExternalAuthMethod(req, res);
		
	}
};

export default Handler;