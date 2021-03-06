import type { NextApiRequest, NextApiResponse } from 'next';
import path from 'path';
import fs from 'fs-extra';

const footerDir = path.join(process.cwd(), '/public/images/footers');

export default async (req: NextApiRequest, res: NextApiResponse) => {
	const footers = (await fs.readdir(footerDir)).filter(footer => /\.(?:png|gif)$/i.test(footer));
	res.status(200).send({
		name: footers[Math.floor(Math.random() * footers.length)]
	});
};