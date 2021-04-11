import mongodb, { MongoClient, ObjectId } from 'mongodb';
import type { Db, Collection } from 'mongodb';

// `as any` below is to make TypeScript not angry when this module is imported from `scripts/setup`.
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

/** A `Collection` with only its async function properties. */
type PartialCollection<Document extends Record<string, any> = any> = {
	[Key in keyof Collection<Document>]: Collection<Document>[Key] extends (...args: any) => Promise<any>
		? Collection<Document>[Key]
		: undefined
};

const db = {
	collection: <Document>(name: string) => {
		// Check if the database has already connected.
		if (mspfaDB) {
			return mspfaDB.collection<Document>(name);
		}

		/**
		 * Before the DB connects, this is the collection with only its async function properties (`PartialCollection<Document>`).
		 *
		 * After the DB connects, this is set to the full collection (`Collection<Document>`).
		 */
		const partialCollection: Collection<Document> | PartialCollection<Document> = {} as any;

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

export type UnsafeObjectID = ConstructorParameters<typeof ObjectId>[0] | undefined;

/** Calls `new ObjectId(id)` but returns `undefined` instead of throwing when `id` is invalid. */
export const safeObjectID = (id: UnsafeObjectID) => {
	try {
		return new ObjectId(id);
	} catch {
		return undefined;
	}
};

/**
 * Flattens an object so it can be used in `$set` operations with deep merging instead of the default shallow merging.
 *
 * Ingores `undefined`.
 *
 * Example:
 * ```
 * flatten({
 * 	a: {
 * 		b: 1,
 * 		c: [2, 3],
 * 		d: undefined
 * 	},
 * 	e: 4
 * }) === {
 * 	'a.b': 1,
 * 	'a.c.0': 2,
 * 	'a.c.1': 3,
 * 	'e': 4
 * }
 * ```
 */
export const flatten = (
	object: Record<any, unknown> | unknown[],
	prefix = '',
	flatObject: Record<string, any> = {}
) => {
	if (Array.isArray(object)) {
		for (let i = 0; i < object.length; i++) {
			const item = object[i];

			if (item instanceof Object) {
				flatten(item as any, `${prefix + i}.`, flatObject);
			} else if (item !== undefined) {
				flatObject[prefix + i] = item;
			}
		}
	} else {
		for (const key in object) {
			const value = object[key];

			if (value instanceof Object) {
				flatten(value as any, `${prefix + key}.`, flatObject);
			} else if (value !== undefined) {
				flatObject[prefix + key] = value;
			}
		}
	}

	return flatObject;
};