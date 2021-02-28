import type express from 'express';

export default (req: express.Request, res: express.Response) => {
	res.statusCode = 200;
	res.json({ name: 'John Doe' });
};