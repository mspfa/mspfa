import type { APIHandler } from 'modules/server/api';
import fs from 'fs-extra';
import path from 'path';
import validate from './index.validate';

const footers = (fs.readdirSync(
	path.join(process.cwd(), 'public/images/footers')
)).filter(footer => /\.(?:png|gif)$/i.test(footer));

const Handler: APIHandler<{ method: 'GET' }> = async (req, res) => {
	await validate(req, res);

	res.status(200).send(footers);
};

export default Handler;