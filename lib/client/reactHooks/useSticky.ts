import type { RefObject } from 'react';
import { useEffect } from 'react';
import { addViewportListener, removeViewportListener } from 'lib/client/viewportListener';
import frameThrottler from 'lib/client/frameThrottler';

const stickyElements: HTMLElement[] = [];

let viewportListenerKey: symbol;

const updateViewport = () => {
	/** The height of all prior sticky elements. */
	let netStickyHeight = 0;
	/** The height of all prior stuck sticky elements. */
	let netStuckHeight = 0;

	for (const stickyElement of stickyElements) {
		const style = getComputedStyle(stickyElement);

		if (style.position !== 'sticky') {
			stickyElement.style.top = '';
			continue;
		}

		// Stick the top of this element to the bottom of the previous element.
		const styleTop = netStuckHeight;
		stickyElement.style.top = (
			styleTop === 0
				// Avoid setting `top` to `0` in order to future-proof, so that styles can't rely on `top` already being set.
				? ''
				: `${styleTop}px`
		);

		const rect = stickyElement.getBoundingClientRect();
		netStickyHeight += rect.height;

		// TODO: Fix that this is incorrectly `false` when the sticky element reaches the bottom of the parent, probably by refactoring this to use `IntersectionObserver` instead of viewport listener checks.
		const stuck = styleTop === rect.top;

		if (!stuck) {
			stickyElement.classList.remove('stuck');
			continue;
		}

		stickyElement.classList.add('stuck');
		netStuckHeight += rect.height;
	}

	// Use `netStickyHeight` instead of `netStuckHeight` because a scroll from a higher position where a sticky element is not stuck to a lower position where it's stuck would cause it to become stuck but not consider the new scroll padding which would be added due to the element becoming stuck after the scroll. The scroll padding needs to be set before the scroll occurs in order to be useful.
	document.documentElement.style.scrollPaddingTop = (
		netStickyHeight
			? `${netStickyHeight}px`
			: ''
	);
};

const byDocumentPosition = (a: Node, b: Node) => (
	a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_PRECEDING
		? 1
		: -1
);

const addStickyElement = (newStickyElement: HTMLElement) => {
	stickyElements.push(newStickyElement);
	stickyElements.sort(byDocumentPosition);

	// Only run the rest if this is the first sticky element to be added.
	if (stickyElements.length !== 1) {
		return;
	}

	viewportListenerKey = addViewportListener(updateViewport);

	frameThrottler(viewportListenerKey).then(() => {
		updateViewport();
	});
};

const removeStickyElement = (stickyElement: HTMLElement) => {
	const elementIndex = stickyElements.indexOf(stickyElement);
	stickyElements.splice(elementIndex, 1);

	// Stop listening to the viewport if all sticky elements have been removed.
	if (stickyElements.length === 0) {
		removeViewportListener(viewportListenerKey);
	}

	frameThrottler(viewportListenerKey).then(() => {
		updateViewport();
	});
};

/**
 * A hook to handle any element that's sticky to the top of the viewport.
 *
 * Automatically updates `document.documentElement.style.scrollPaddingTop` and `stickyElementRef.current.style.top`.
 */
const useSticky = (
	/** A ref to the sticky element. */
	stickyElementRef: RefObject<HTMLElement>
) => {
	useEffect(() => {
		const stickyElement = stickyElementRef.current;
		if (!stickyElement) {
			return;
		}

		addStickyElement(stickyElement);

		return () => {
			removeStickyElement(stickyElement);
		};
	});
	// The above effect hook should have no dependencies because it should call `updateViewport` every re-render in case re-rendering the component changed the element or its related styles.
};

export default useSticky;
