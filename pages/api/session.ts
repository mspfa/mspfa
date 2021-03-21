import type { APIHandler } from 'modules/server/api';
import Cookies from 'cookies';

export default (async (req, res) => {
	const cookies = new Cookies(req, res);
	
	if (req.method === 'POST') {
		
	} else {
		res.status(405).end();
	}
}) as APIHandler;