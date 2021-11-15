import dotenv from 'dotenv';

(process.env as any).NODE_ENV = process.argv[2] || 'development';
dotenv.config({ path: '.env.local' });
dotenv.config({ path: `.env.${process.env.NODE_ENV}` });
dotenv.config({ path: '.env' });

import { connection } from '../lib/server/db';
import c from 'ansi-colors';

console.info(c.blue('Creating database collections...'));

connection.then(async db => {
	await Promise.all([
		db.createCollection('users'),
		db.createCollection('stories'),
		db.createCollection('messages')
	]);

	console.info(c.green('Done!'));
	process.exit();
});

export {};