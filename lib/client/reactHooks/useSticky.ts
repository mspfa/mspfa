import type { RefObject } from 'react';
import { useEffect } from 'react';
import { addViewportListener, removeViewportListener } from 'lib/client/viewportListener';
import frameThrottler from 'lib/client/frameThrottler';

const stickyElementRefs: Array<RefObject<HTMLElement>> = [];

let _viewportListener: symbol;
let updateViewport: () => void;

const addStickyElementRef = (stickyElementRefToAdd: RefObject<HTMLElement>) => {
	stickyElementRefs.push(stickyElementRefToAdd);

	// Check if this is the first to be added.
	if (stickyElementRefs.length === 1) {
		updateViewport = () => {
			/** The total height of all sticky elements. */
			let netStickyHeight = 0;

			for (const stickyElementRef of stickyElementRefs) {
				if (stickyElementRef.current) {
					const style = getComputedStyle(stickyElementRef.current);

					if (style.position === 'sticky') {
						const rect = stickyElementRef.current.getBoundingClientRect();

						// Add the heights of sticky elements even if they aren't stuck because a scroll from a higher position where it's not stuck to a lower position where it's stuck would cause it to become stuck but not consider the new scroll padding which would be added due to the element becoming stuck after the scroll. The scroll padding needs to be set before the scroll occurs in order to be effective.
						netStickyHeight += rect.height;

						const styleTop = +style.top.slice(0, -2);
						stickyElementRef.current.classList[
							styleTop === rect.top
								? 'add'
								: 'remove'
						]('stuck');
					}
				}
			}

			document.documentElement.style.scrollPaddingTop = (
				netStickyHeight
					? `${netStickyHeight}px`
					: ''
			);
		};

		_viewportListener = addViewportListener(updateViewport);

		frameThrottler(_viewportListener).then(() => {
			updateViewport();
		});
	}
};

const removeStickyElementRef = (stickyElementRef: RefObject<HTMLElement>) => {
	const elementIndex = stickyElementRefs.indexOf(stickyElementRef);
	stickyElementRefs.splice(elementIndex, 1);

	// Check if all have been removed.
	if (stickyElementRefs.length === 0) {
		removeViewportListener(_viewportListener);
	}

	frameThrottler(_viewportListener).then(() => {
		updateViewport();
	});
};

/** A hook to automatically update `document.documentElement.style.scrollPaddingTop` to accommodate sticky elements. Please call this hook on any sticky element which sticks to the top of the viewport if it is above any part of the page's main content. */
const useSticky = (
	/** A ref to the sticky element. */
	stickyElementRef: RefObject<HTMLElement>
) => {
	useEffect(() => {
		addStickyElementRef(stickyElementRef);

		return () => {
			removeStickyElementRef(stickyElementRef);
		};
	});
	// The above effect hook should have no dependencies because it should call `updateViewport` every re-render in case re-rendering the component changed the element or its related styles.
};

export default useSticky;