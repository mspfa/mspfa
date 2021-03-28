import mongodb, { MongoClient } from 'mongodb';
import type { Db, Collection } from 'mongodb';

// `as any` below is to make TypeScript not angry when this module is imported from `modules/server/setup`.
const client = new MongoClient((process.env as any).DB_HOST, {
	useUnifiedTopology: true
});

let mspfaDB: Db | undefined;

/**
 * A promise which resolves when the DB connects.
 * 
 * The resolution value is the raw MSPFA DB instance.
 */
export const connection = client.connect().then(() => {
	mspfaDB = client.db('mspfa');
	return mspfaDB;
});

// `mongodb as any` below, along with the `mongodb` import as opposed to importing `Collection` directly, is necessary because `@types/mongodb` doesn't support the `Collection` class.
/** An array of the keys of a `Collection` instance. */
const collectionKeys: Array<keyof Collection> = Object.keys((mongodb as any).Collection.prototype) as any[];

const db = {
	collection: <Document>(name: string) => {
		// Check if the database has already connected.
		if (mspfaDB) {
			return mspfaDB.collection<Document>(name);
		}
		
		/** `Collection<Document>` with only its async function properties. */
		type PartialCollection = {
			[Key in keyof Collection<Document>]: Collection<Document>[Key] extends (...args: any) => Promise<any>
				? Collection<Document>[Key]
				: undefined
		};
		
		/**
		 * Before the DB connects, this is the collection with only its async function properties (`PartialCollection`).
		 * 
		 * After the DB connects, this is set to the full collection (`Collection<Document>`).
		 */
		const partialCollection: Collection<Document> | PartialCollection = {} as any;
		
		const collectionUpdate = connection.then(() => {
			const collection = mspfaDB!.collection<Document>(name);
			
			// Now that the DB has connected, set all of the properties of the full collection.
			for (const key of collectionKeys) {
				const value = collection[key];
				partialCollection[key] = typeof value === 'function' ? value.bind(collection) : value;
			}
		});
		
		// The DB has not connected yet, so set only the async function properties on the `partialCollection`.
		for (const key of collectionKeys) {
			partialCollection[key] = async (...args: any[]) => {
				await collectionUpdate;
				return partialCollection[key](...args);
			};
		}
		
		return partialCollection;
	}
};

export default db;