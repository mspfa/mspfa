import 'modules/server/env';
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