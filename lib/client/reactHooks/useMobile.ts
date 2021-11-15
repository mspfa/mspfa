import { useState } from 'react';
import useIsomorphicLayoutEffect from 'lib/client/reactHooks/useIsomorphicLayoutEffect';

const PAGE_WIDTH = 950;

/** A hook which returns whether the user is on mobile. */
export const useMobile = (defaultValue = false) => {
	const [mobile, setMobile] = useState(defaultValue);

	// This is a layout effect hook rather than a normal effect hook so that `mobile` can hold the correct value as soon as possible.
	useIsomorphicLayoutEffect(() => {
		/** A media query which matches whether the user is on mobile. */
		const mobileQuery = window.matchMedia(`not screen and (min-width: ${PAGE_WIDTH}px)`);

		const updateMobileQuery = () => {
			if (mobile !== mobileQuery.matches) {
				setMobile(mobileQuery.matches);
			}
		};

		mobileQuery.addEventListener('change', updateMobileQuery);

		updateMobileQuery();

		return () => {
			mobileQuery.removeEventListener('change', updateMobileQuery);
		};
	}, [mobile]);

	return mobile;
};