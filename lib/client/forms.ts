import type { RecursivePartial } from 'lib/types';
import { useEffect } from 'react';
import useFunction from 'lib/client/reactHooks/useFunction';
import Router from 'next/router';
import { isEqual } from 'lodash';

const message = 'Are you sure you want to leave? Changes you made may not be saved.';

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

	if (values instanceof Array) {
		return (
			isEqual(initialValues, values)
				? undefined
				: values
		);
	}

	for (const key of Object.keys(values) as Array<keyof Values>) {
		if (values[key] instanceof Object && initialValues[key] instanceof Object) {
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

let leaveConfirmationsToPrevent = 0;

/** Prevent a number of the following leave confirmations. */
export const preventLeaveConfirmations = (
	/** How many additional leave confirmations to prevent. */
	count = 1
) => {
	leaveConfirmationsToPrevent += count;
	return leaveConfirmationsToPrevent;
};

/**
 * A React hook which asks the user for confirmation to leave the page if there are unsaved changes.
 *
 * Returns a function `shouldLeave` which checks for unsaved changes, prompts the user with a leave confirmation if there are any, and returns a boolean for whether it is safe to leave.
 */
export const useLeaveConfirmation = (
	/** Whether there are currently unsaved changes which should prompt confirmation. */
	unsavedChanges: boolean | (() => boolean)
) => {
	const shouldConfirmLeave = useFunction(() => {
		if (leaveConfirmationsToPrevent) {
			leaveConfirmationsToPrevent--;
			return false;
		}

		return (
			typeof unsavedChanges === 'boolean'
				? unsavedChanges
				: unsavedChanges()
		);
	});

	const shouldLeave = useFunction(() => (
		!shouldConfirmLeave()
		|| confirm(message)
	));

	useEffect(() => {
		const onBeforeUnload = (event: BeforeUnloadEvent) => {
			if (shouldConfirmLeave()) {
				event.preventDefault();
				event.returnValue = message;
				return message;
			}
		};

		const onRouteChangeStart = (path: string) => {
			if (
				Router.asPath !== path
				&& !shouldLeave()
			) {
				Router.events.emit('routeChangeError');
				Router.replace(Router.asPath, Router.asPath, { shallow: true });

				// Next being opinionated can be bullshit. To see why throwing a string is necessary, see the issue linked in said string.
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
	}, [shouldConfirmLeave, shouldLeave]);

	return shouldLeave;
};