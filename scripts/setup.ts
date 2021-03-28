import dotenv from 'dotenv';
dotenv.config({
	path: `.env.${process.argv[2] || 'development'}`
});
// The above code needs to come before the following import, because the above code loads env values which are used in the following import.
import { connection } from 'modules/server/db';

connection.then(db => {
	Promise.all([
		db.createCollection('users'),
		db.createCollection('comics'),
		db.createCollection('messages')
	]).catch(() => {}).finally(() => {
		process.exit();
	});
});

export {};