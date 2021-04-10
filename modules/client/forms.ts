import type { RecursivePartial } from 'modules/types';

/**
 * Returns an object with only the properties in `values` which are not equal in `initialValues` (recursively).
 *
 * Returns `undefined` if there are no changed values.
 */
export const getChangedValues = <
	Values extends Record<string, unknown> = Record<string, unknown>
>(initialValues: Values, values: Values) => {
	let changed = false;
	const changedValues: RecursivePartial<Values> = {};

	for (const key in values) {
		if (values[key] instanceof Object) {
			const changedSubValues = getChangedValues(initialValues[key] as any, values[key]);

			if (changedSubValues) {
				(changedValues as any)[key] = changedSubValues;

				changed = true;
			}
		} else if (initialValues[key] !== values[key]) {
			(changedValues as any)[key] = values[key];

			changed = true;
		}
	}

	return changed ? changedValues : undefined;
};