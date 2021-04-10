import type { RecursivePartial } from 'modules/types';

/**
 * Returns an object with only the properties in `values` which are not equal in `initialValues` (recursively).
 *
 * Returns `undefined` if there are no changed values.
 */
export const getChangedValues = <Values = any>(initialValues: Values, values: Values) => {
	let changed = false;
	const changedValues: RecursivePartial<Values> = {};

	for (const key in values) {
		if (values[key] instanceof Object) {
			const changedSubValues = getChangedValues(initialValues[key], values[key]);

			if (changedSubValues) {
				(changedValues as Values)[key] = changedSubValues as Values[typeof key];

				changed = true;
			}
		} else if (initialValues[key] !== values[key]) {
			(changedValues as Values)[key] = values[key];

			changed = true;
		}
	}

	return changed ? changedValues : undefined;
};