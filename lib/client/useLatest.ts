import { useRef } from 'react';

/** Returns a ref to the latest value passed into this hook. */
const useLatest = <Value>(value: Value) => {
	const ref = useRef(value);
	ref.current = value;
	return ref;
};

export default useLatest;