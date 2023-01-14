import './styles.module.scss';
import React, { useState, useEffect, useRef } from 'react';
import Router from 'next/router';
import classNames from 'classnames';
import useFunction from 'lib/client/reactHooks/useFunction';

/** The number of milliseconds to wait to show the loading indicator after the `loadingCount` is non-zero. */
const LOADING_INDICATOR_DELAY = 250;

/** Increment the count which displays the loading indicator when non-zero. */
export let startLoading: (
	/** The number of things which started loading. Defaults to 1. */
	count?: number
) => void;

/** Decrement the count which displays the loading indicator when non-zero. */
export let stopLoading: (
	/** The number of things which stopped loading. Defaults to 1. */
	count?: number
) => void;

/**
 * The component which renders the loading indicator.
 *
 * ⚠️ This should never be rendered anywhere but in `_app`.
 */
const LoadingIndicator = () => {
	const [loading, setLoading] = useState(false);

	/** A ref to the count which displays the loading indicator when non-zero. */
	const loadingCountRef = useRef(0);
	/** A ref to the `LOADING_INDICATOR_DELAY` timeout. */
	const timeoutRef = useRef<NodeJS.Timeout>();

	startLoading = useFunction((count = 1) => {
		loadingCountRef.current += count;

		if (timeoutRef.current) {
			return;
		}

		timeoutRef.current = setTimeout(() => {
			timeoutRef.current = undefined;

			setLoading(true);
		}, LOADING_INDICATOR_DELAY);
	});

	stopLoading = useFunction((count = 1) => {
		loadingCountRef.current -= count;

		if (loadingCountRef.current !== 0) {
			return;
		}

		clearTimeout(timeoutRef.current);
		timeoutRef.current = undefined;

		setLoading(false);
	});

	useEffect(() => () => {
		clearTimeout(timeoutRef.current);
	}, []);

	useEffect(() => {
		let changingRoute = false;

		const startRouteChange = () => {
			if (changingRoute) {
				return;
			}

			changingRoute = true;
			startLoading();
		};

		const stopRouteChange = () => {
			if (!changingRoute) {
				return;
			}

			changingRoute = false;
			stopLoading();
		};

		Router.events.on('routeChangeStart', startRouteChange);
		Router.events.on('routeChangeComplete', stopRouteChange);
		Router.events.on('routeChangeError', stopRouteChange);

		return () => {
			Router.events.off('routeChangeStart', startRouteChange);
			Router.events.off('routeChangeComplete', stopRouteChange);
			Router.events.off('routeChangeError', stopRouteChange);
		};
	}, []);

	return (
		<div
			id="loading-indicator"
			className={classNames({ loading })}
		/>
	);
};

export default LoadingIndicator;
