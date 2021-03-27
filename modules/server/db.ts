import { MongoClient } from 'mongodb';

// The `as any` below is to make TypeScript not angry when this module is imported from `modules/server/setup`.
const client = new MongoClient((process.env as any).DB_HOST, {
	useUnifiedTopology: true
});
client.connect();

const db = client.db('mspfa');

export default db;