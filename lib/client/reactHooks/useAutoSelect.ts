import { useEffect, useRef } from 'react';

/** Returns a ref which must be passed into an element to be auto-selected on first mount. */
const useAutoSelect = () => {
	const elementRef = useRef<HTMLInputElement & HTMLTextAreaElement>(null!);

	useEffect(() => {
		elementRef.current.select();
	}, []);

	return elementRef;
};

export default useAutoSelect;