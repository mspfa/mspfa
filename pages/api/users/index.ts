import type { APIHandler } from 'modules/server/api';
import { checkExternalAuthMethod } from 'modules/server/auth';

export default (async (req, res) => {
	if (req.method === 'POST') {
		console.log(req.body);
		if (!(req.body instanceof Object)) {
			res.status(400).send({ message: 'The request body must be an object.' });
			return;
		}
		if (!(req.body.authMethod instanceof Object)) {
			res.status(400).send({ message: '`authMethod` must be an object.' });
			return;
		}
		
		const externalData = await checkExternalAuthMethod(req.body.authMethod, req, res);
	} else {
		res.status(405).end();
	}
}) as APIHandler;