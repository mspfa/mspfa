import type { MutableRefObject } from 'react';
import { useRef } from 'react';
import useFunction from 'lib/client/reactHooks/useFunction';

export type ThrottledCallback<CallbackArgs extends unknown[]> = ((...args: CallbackArgs) => void) & {
	timeoutRef: MutableRefObject<NodeJS.Timeout | undefined>
};

/** Returns a throttled function (with a ref property to its throttle timeout). When attempting to call the throttled function, the callback passed to this hook will only be called a short time (defaulting to 500 ms) after it stops being called. */
const useThrottled = <CallbackArgs extends unknown[]>(
	/** The function to throttle. */
	callback: (...args: CallbackArgs) => unknown,
	/** The number of milliseconds to wait after the function stops being called. */
	delay = 500
) => {
	const timeoutRef = useRef<NodeJS.Timeout>();

	const throttledCallback = useFunction((...args: CallbackArgs) => {
		if (timeoutRef.current) {
			clearTimeout(timeoutRef.current);
		}

		timeoutRef.current = setTimeout(() => {
			timeoutRef.current = undefined;

			callback(...args);
		}, delay);
	}) as ThrottledCallback<CallbackArgs>;

	throttledCallback.timeoutRef = timeoutRef;

	return throttledCallback;
};

export default useThrottled;