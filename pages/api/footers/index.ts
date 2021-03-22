import type { APIHandler } from 'modules/server/api';
import fs from 'fs-extra';
import path from 'path';
import validate from './index.validate';

const footers = (fs.readdirSync(
	path.join(process.cwd(), '/public/images/footers')
)).filter(footer => /\.(?:png|gif)$/i.test(footer));

export type Request = { method: 'GET' };

export default (async (req, res) => {
	await validate(req, res);
	
	res.status(200).send(footers);
}) as APIHandler<Request>;