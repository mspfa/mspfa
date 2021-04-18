import '../modules/server/env';
import { connection } from '../modules/server/db';
import c from 'ansi-colors';

console.log(c.blue('Creating database collections...'));

connection.then(db => {
	Promise.all([
		db.createCollection('users'),
		db.createCollection('stories'),
		db.createCollection('messages')
	]).catch(() => {}).finally(() => {
		console.log(c.green('Done!'));
		process.exit();
	});
});

export {};