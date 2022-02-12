import { ObjectId } from 'mongodb';

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
const flatten = (
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

export default flatten;