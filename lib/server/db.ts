import { Collection, MongoClient, ObjectId } from 'mongodb';
import type { Db } from 'mongodb';

// `as any` below is to make TypeScript not angry when this module is imported from `scripts/setup`.
const client = new MongoClient((process.env as any).DB_HOST);

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

export type UnsafeObjectID = ConstructorParameters<typeof ObjectId>[0] | undefined;

/** Calls `new ObjectId(id)` but returns `undefined` instead of throwing an error when `id` is invalid. */
export const safeObjectID = (id: UnsafeObjectID) => {
	try {
		return new ObjectId(id);
	} catch {}
};

/**
 * Flattens an object so it can be used in `$set` operations with deep merging instead of the default shallow merging.
 *
 * Intentionally does not flatten arrays or items in arrays so that item removal is possible with only `$set`.
 *
 * Excludes any `undefined` properties.
 *
 * Example:
 * ```
 * flatten({
 * 	a: {
 * 		b: 1,
 * 		c: [2, { d: 3 }],
 * 		e: undefined
 * 	},
 * 	f: 4
 * }) === {
 * 	'a.b': 1,
 * 	'a.c': [2, { d: 3 }],
 * 	'f': 4
 * }
 * ```
 */
export const flatten = (
	/** The object to flatten. */
	object: Record<any, unknown>,
	/** A string to prepend before every key assigned to the object e.g. `'pages.'`. */
	keyPrefix = '',
	/** The object to assign the flattened properties to. Defaults to a new empty object. */
	flatObject: Record<string, any> = {}
) => {
	for (const key of Object.keys(object)) {
		const value = object[key];

		if (value instanceof Object && !(
			value instanceof Array
			|| value instanceof Date
			|| value instanceof ObjectId
		)) {
			flatten(
				value as Record<any, unknown>,
				`${keyPrefix + key}.`,
				flatObject
			);
		} else if (value !== undefined) {
			flatObject[keyPrefix + key] = value;
		}
	}

	return flatObject;
};