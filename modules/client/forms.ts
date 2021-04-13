import type { RecursivePartial } from 'modules/types';
import { useEffect } from 'react';
import Router from 'next/router';

/**
 * Converts any string to a `className`-friendly format.
 *
 * Example:
 * ```
 * toClassName('THEQuick... brown.foxJumps!') === 't-h-e-quick-brown-fox-jumps'
 * ```
 */
export const toClassName = (string: string) => (
	string
		.replace(/([A-Z])/g, '-$1')
		.replace(/\W/g, '-')
		.replace(/-+/g, '-')
		.replace(/^-|-$/g, '')
		.toLowerCase()
);
console.log(toClassName('THEQuick... brown.foxJumps!'));

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

/** A React hook which asks the user for confirmation to leave the page if there are unsaved changes. */
export const useLeaveConfirmation = (
	/** Whether there are currently unsaved changes which should prompt confirmation. */
	unsavedChanges: boolean
) => {
	const message = 'Are you sure you want to leave? Changes you made may not be saved.';

	useEffect(() => {
		const onBeforeUnload = (evt: BeforeUnloadEvent) => {
			if (unsavedChanges) {
				evt.preventDefault();
				evt.returnValue = message;
				return message;
			}
		};

		const onRouteChangeStart = (path: string) => {
			if (unsavedChanges && Router.asPath !== path && !confirm(message)) {
				Router.events.emit('routeChangeError');
				Router.replace(Router, Router.asPath);

				// eslint-disable-next-line @typescript-eslint/no-throw-literal
				throw 'Route change prevented. Please ignore this error.\nhttps://github.com/vercel/next.js/issues/2476#issuecomment-573460710';
			}
		};

		window.addEventListener('beforeunload', onBeforeUnload);
		Router.events.on('routeChangeStart', onRouteChangeStart);

		return () => {
			window.removeEventListener('beforeunload', onBeforeUnload);
			Router.events.off('routeChangeStart', onRouteChangeStart);
		};
	}, [unsavedChanges]);
};