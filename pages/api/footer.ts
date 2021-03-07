import type { NextApiRequest, NextApiResponse } from 'next';
import fs from 'fs-extra';
import path from 'path';

const footers = (fs.readdirSync(
	path.join(process.cwd(), '/public/images/footers')
)).filter(footer => /\.(?:png|gif)$/i.test(footer));

export default async (req: NextApiRequest, res: NextApiResponse) => {
	res.status(200).send({
		name: footers[Math.floor(Math.random() * footers.length)]
	});
};