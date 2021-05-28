import './styles.module.scss';
import createGlobalState from 'global-react-state';
import React from 'react';
import Router from 'next/router';

const [useLoadingCount, setLoadingCount, getLoadingCount] = createGlobalState(0);

/** An amount to be set as loading count at the end of the `startLoadingTimeout`. */
let queuedLoadingCount = 0;
let startLoadingTimeout: NodeJS.Timeout | undefined;

/**
 * Increment the count which displays the loading indicator when non-zero.
 *
 * Returns the new value of the count.
 */
export const startLoading = (
	/** The number of things which started loading. */
	count = 1
) => {
	if (startLoadingTimeout) {
		return queuedLoadingCount += count;
	}

	const previousLoadingCount = getLoadingCount();

	if (previousLoadingCount) {
		const loadingCount = previousLoadingCount + count;
		setLoadingCount(loadingCount);
		return loadingCount;
	}

	startLoadingTimeout = setTimeout(() => {
		startLoadingTimeout = undefined;

		setLoadingCount(queuedLoadingCount);
		queuedLoadingCount = 0;
	}, 250);

	return queuedLoadingCount += count;
};

/**
 * Decrement the count which displays the loading indicator when non-zero.
 *
 * Returns the new value of the count.
 */
export const stopLoading = (
	/** The number of things which stopped loading. */
	count = 1
) => {
	if (startLoadingTimeout) {
		queuedLoadingCount -= count;

		if (!queuedLoadingCount) {
			clearTimeout(startLoadingTimeout);
			startLoadingTimeout = undefined;
		}

		return;
	}

	const loadingCount = getLoadingCount() - count;
	setLoadingCount(loadingCount);
	return loadingCount;
};

Router.events.on('routeChangeStart', () => {
	startLoading();
});

const stopLoadingPage = () => {
	// This timeout is necessary so the loading state of the `LoadingIndicator` component is not set during a route change, causing it to update incorrectly.
	setTimeout(() => {
		stopLoading();
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