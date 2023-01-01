import useFunction from 'lib/client/reactHooks/useFunction';

export type ThrottledCallback<CallbackArgs extends unknown[]> = ((...args: CallbackArgs) => void) & {
	/** The return value of the `setTimeout` call used to throttle the callback, or undefined if there is currently no timeout. */
	timeout?: NodeJS.Timeout
};

/** Returns a throttled function (with a property of its current throttle timeout). When attempting to call the throttled function, the callback passed to this hook will only be called a short time after it stops being called. */
const useThrottled = <CallbackArgs extends unknown[]>(
	/** The number of milliseconds to wait after the function stops being called. */
	delay: number,
	/** The function to throttle. */
	callback: (...args: CallbackArgs) => unknown
) => {
	const throttledCallback: ThrottledCallback<CallbackArgs> = (
		useFunction((...args) => {
			if (throttledCallback.timeout) {
				clearTimeout(throttledCallback.timeout);
			}

			throttledCallback.timeout = setTimeout(() => {
				throttledCallback.timeout = undefined;

				callback(...args);
			}, delay);
		})
	);

	return throttledCallback;
};

export default useThrottled;
