import type { NextApiRequest, NextApiResponse } from 'next';
import fs from 'fs-extra';
import path from 'path';

const footerDir = path.join(process.cwd(), '/public/images/footers');

export default async (req: NextApiRequest, res: NextApiResponse) => {
	const footers = await fs.readdir(footerDir);
	res.status(200).json({
		name: footers[Math.floor(Math.random() * footers.length)]
	});
};