import { Collection, MongoClient } from 'mongodb';
import type { Db } from 'mongodb';

const client = new MongoClient(process.env.DB_HOST!);

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

/** An array of all the keys of a `Collection` instance. */
const collectionKeys = Object.getOwnPropertyNames(Collection.prototype) as Array<keyof Collection>;

/** A `Collection` with only its async function properties. */
type PartialCollection<Document extends Record<string, any> = any> = {
	[Key in keyof Collection<Document>]: (
		Collection<Document>[Key] extends (...args: any) => Promise<any>
			? Collection<Document>[Key]
			: undefined
	)
};

const db = {
	collection: <Document>(name: string) => {
		// Check if the database has already connected.
		if (mspfaDB) {
			return mspfaDB.collection<Document>(name);
		}

		// This is typed as `any` because I don't think figuring out a mutable type that works here is worth my time.
		/**
		 * Before the DB connects, this is the collection with only its async function properties (`PartialCollection<Document>`).
		 *
		 * After the DB connects, this is set to the full collection (`Collection<Document>`).
		 */
		const partialCollection: any = {};

		const collectionUpdate = connection.then(() => {
			const collection = mspfaDB!.collection<Document>(name);

			// Now that the DB has connected, set all of the properties of the full collection.
			for (const key of collectionKeys) {
				const value = collection[key];
				partialCollection[key] = (
					typeof value === 'function'
						? value.bind(collection)
						: value
				);
			}
		});

		// The DB has not connected yet, so set only the async function properties on the `partialCollection`.
		for (const key of collectionKeys) {
			partialCollection[key] = async (...args: any[]) => {
				await collectionUpdate;
				return partialCollection[key](...args);
			};
		}

		return partialCollection as Collection<Document> | PartialCollection<Document>;
	}
};

export default db;