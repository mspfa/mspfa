import createGlobalState from 'global-react-state';
import React from 'react';
import Router from 'next/router';
import './styles.module.scss';

const [useLoadingCount, setLoadingCount, getLoadingCount] = createGlobalState(0);

/**
 * Increment the count which displays the loading indicator when non-zero.
 *
 * Returns the new value of the count.
 */
export const startLoading = (
	/** The number of things which started loading. */
	count = 1
) => {
	const loadingCount = getLoadingCount() + count;
	setLoadingCount(loadingCount);
	return loadingCount;
};

/**
 * Decrement the count which displays the loading indicator when non-zero.
 *
 * Returns the new value of the count.
 */
export const stopLoading = (
	/** The number of things which stopped loading. */
	count = 1
) => startLoading(-count);

let loadingPage = false;
let startLoadingTimeout: NodeJS.Timeout | undefined;

Router.events.on('routeChangeStart', () => {
	if (startLoadingTimeout) {
		// Not sure if this is actually necessary--I've not been able to get this to call from my testing--but might as well put it here.
		clearTimeout(startLoadingTimeout);
	}

	// Only show the loading indicator if the route change takes at least this timeout's duration to load.
	startLoadingTimeout = setTimeout(() => {
		startLoadingTimeout = undefined;

		startLoading();
		loadingPage = true;
	}, 250);
});

const stopLoadingPage = () => {
	// This `setTimeout` is necessary so the loading state of the `LoadingIndicator` component is not set during a route change, causing it to update incorrectly.
	setTimeout(() => {
		if (loadingPage) {
			loadingPage = false;
			stopLoading();
		} else {
			clearTimeout(startLoadingTimeout!);

			startLoadingTimeout = undefined;
		}
	});
};
Router.events.on('routeChangeComplete', stopLoadingPage);
Router.events.on('routeChangeError', stopLoadingPage);

/**
 * The component which renders the loading indicator.
 *
 * ⚠️ This should never be rendered anywhere but in the `Page` component's direct children.
 */
const LoadingIndicator = () => {
	const [loadingCount] = useLoadingCount();

	return (
		<div
			id="loading-indicator"
			className={loadingCount ? 'loading' : undefined}
		/>
	);
};

export default LoadingIndicator;