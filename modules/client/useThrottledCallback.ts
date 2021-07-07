import type { DependencyList, MutableRefObject } from 'react';
import { useCallback, useRef } from 'react';

export type ThrottledCallback<CallbackArgs extends unknown[]> = ((...args: CallbackArgs) => void) & {
	timeoutRef: MutableRefObject<NodeJS.Timeout | undefined>
};

/** Returns a throttled function (with a ref property to its throttle timeout). When attempting to call the throttled function, the callback passed to this hook will only be called a short time (defaulting to 500 ms) after it stops being called. */
const useThrottledCallback = <CallbackArgs extends unknown[]>(
	/** The function to throttle. */
	callback: (...args: CallbackArgs) => unknown,
	deps: DependencyList,
	/** The number of milliseconds to wait after the function stops being called. */
	delay = 500
) => {
	const timeoutRef = useRef<NodeJS.Timeout>();

	const throttledCallback = useCallback((...args: CallbackArgs) => {
		if (timeoutRef.current) {
			clearTimeout(timeoutRef.current);
		}

		timeoutRef.current = setTimeout(() => {
			timeoutRef.current = undefined;

			callback(...args);
		}, delay);

		// This ESLint comment is necessary because it thinks `callback` should be a dependency even though it is a function which may change every re-render. ESLint cannot possibly know the dependencies of an arbitrary function passed in from outside, so its dependencies should be passed in from outside as well.
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [delay, ...deps]) as ThrottledCallback<CallbackArgs>;

	throttledCallback.timeoutRef = timeoutRef;

	return throttledCallback;
};

export default useThrottledCallback;