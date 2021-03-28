import { MongoClient } from 'mongodb';
import type { Db, Collection } from 'mongodb';

// The `as any` below is to make TypeScript not angry when this module is imported from `modules/server/setup`.
const client = new MongoClient((process.env as any).DB_HOST, {
	useUnifiedTopology: true
});

let mspfa: Db;

export const connection = client.connect().then(() => {
	mspfa = client.db('mspfa');
	return mspfa;
});

const db = {
	collection: <
		Document,
		ProxiedCollection extends Record<keyof Collection<Document>, (...args: any) => Promise<any>> = {
			[Key in keyof Collection<Document>]: Collection<Document>[Key] extends (...args: any) => Promise<any>
				? Collection<Document>[Key]
				: never
		}
	>(name: string) => {
		let collection: Collection<Document> | undefined;
		connection.then(() => {
			collection = mspfa.collection<Document>(name);
		});
		
		return new Proxy({}, {
			/** The getter for any property of the proxied collection. */
			get: <Key extends keyof Collection<Document>>(
				_target: never,
				key: Key
			) => (
				// Every property in the proxied collection is this async function.
				async (
					...args: [...Parameters<ProxiedCollection[Key]>]
				) => {
					await connection;
					return collection![key](...args);
				}
			)
		}) as unknown as ProxiedCollection;
	}
};

export default db;