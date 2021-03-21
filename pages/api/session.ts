import type { NextApiRequest, NextApiResponse } from 'next';

export default async (req: NextApiRequest, res: NextApiResponse) => {
	if (req.method === 'POST') {
		
	} else {
		res.status(405).end();
	}
};