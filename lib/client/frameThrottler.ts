export type FrameThrottlerKey = string | number | symbol;

export const frameThrottlerRequests: Record<FrameThrottlerKey, number> = {};

/** Returns a promise which only resolves after `requestAnimationFrame` completes. If this function is called with the same key argument multiple times before `requestAnimationFrame`'s completion, the promise will only be resolved for the last call, and previous calls will never resolve. */
const frameThrottler = (key: FrameThrottlerKey) => new Promise<DOMHighResTimeStamp>(resolve => {
	// Check if this function has already been called with the same key during this animation frame.
	if (frameThrottlerRequests[key]) {
		// Throttle the last call with this key.
		cancelAnimationFrame(frameThrottlerRequests[key]);
	}

	frameThrottlerRequests[key] = requestAnimationFrame(time => {
		delete frameThrottlerRequests[key];
		resolve(time);
	});
});

export default frameThrottler;

/**
 * Cancels an animation frame by its `frameThrottler` key and prevents any `frameThrottler` promises with that key from resolving.
 *
 * Returns a boolean for whether an `frameThrottler` request existed with that key and was cancelled.
 */
export const cancelFrameThrottler = (key: FrameThrottlerKey) => {
	if (frameThrottlerRequests[key]) {
		cancelAnimationFrame(frameThrottlerRequests[key]);
		return true;
	}

	return false;
};