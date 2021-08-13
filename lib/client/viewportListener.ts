import frameThrottler, { cancelFrameThrottler } from 'lib/client/frameThrottler';

/** A record which maps each viewport listener key to a function that removes that key's viewport listener. */
const removeViewportListeners: Record<symbol, () => void> = {};

/** Calls `listener` whenever the viewport changes, throttled by `frameThrottler`. Returns a symbol which can be passed into `removeViewportListener` or used as a `frameThrottler` key. */
export const addViewportListener = (listener: () => unknown) => {
	const _viewportListener = Symbol('viewportListener');

	const throttledListener = () => {
		frameThrottler(_viewportListener)
			.then(listener);
	};

	window.addEventListener('resize', throttledListener);
	document.addEventListener('scroll', throttledListener);

	/** A media query which only matches if the current resolution equals the `window.devicePixelRatio` last detected by `listenToPixelRatio`. */
	let resolutionQuery: MediaQueryList;

	/** Gets the current resolution and calls `changePixelRatio` when it is no longer the current resolution. */
	const listenToPixelRatio = () => {
		const dpi = window.devicePixelRatio * 96;
		resolutionQuery = window.matchMedia(
			// Allow any resolution in the range between the floor and the ceiling of `dpi` to ensure it works on browsers that have insufficient precision on `devicePixelRatio` or on `resolution` queries.
			`(min-resolution: ${Math.floor(dpi)}dpi) and (max-resolution: ${Math.ceil(dpi)}dpi)`
		);

		// Listen for a change in the pixel ratio in order to detect when the browser's zoom level changes.
		resolutionQuery.addEventListener('change', changePixelRatio, { once: true });
	};

	/** A function called whenever the pixel ratio changes. */
	const changePixelRatio = () => {
		// Listen for further changes in the pixel ratio again.
		listenToPixelRatio();

		// The pixel ratio has changed, so the viewport has changed.
		throttledListener();
	};

	listenToPixelRatio();

	removeViewportListeners[_viewportListener] = () => {
		cancelFrameThrottler(_viewportListener);
		window.removeEventListener('resize', throttledListener);
		document.removeEventListener('scroll', throttledListener);
		resolutionQuery.removeEventListener('change', changePixelRatio);
	};

	return _viewportListener;
};

export const removeViewportListener = (_viewportListener: symbol) => {
	removeViewportListeners[_viewportListener]();
};