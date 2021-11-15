import { useEffect, useRef } from 'react';

/** Returns a ref to a boolean for whether the component is currently mounted. */
const useMountedRef = () => {
	const mountedRef = useRef(false);

	useEffect(() => {
		mountedRef.current = true;

		return () => {
			mountedRef.current = false;
		};
	}, []);

	return mountedRef;
};

export default useMountedRef;