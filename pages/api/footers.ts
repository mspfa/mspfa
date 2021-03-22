import type { APIHandler } from 'modules/server/api';
import fs from 'fs-extra';
import path from 'path';

const footers = (fs.readdirSync(
	path.join(process.cwd(), '/public/images/footers')
)).filter(footer => /\.(?:png|gif)$/i.test(footer));

export default (async (req, res) => {
	if (req.method === 'GET') {
		res.status(200).send(footers);
	} else {
		res.status(405).end();
	}
}) as APIHandler;