import { useRef } from 'react';

export type UseOnChangeOptions = {
	/** Whether to run the callback on the first render. Defaults to `false`. */
	countFirstRender?: boolean
};

/**
 * Synchronously runs a callback if the specified value changed from the previous render.
 *
 * By default, doesn't run for the first render.
 */
const useOnChange = (
	value: unknown,
	callback: () => void,
	{ countFirstRender = false }: UseOnChangeOptions = {}
) => {
	const previousValue = useRef(countFirstRender ? {} : value);

	if (previousValue.current === value) {
		return;
	}

	callback();

	previousValue.current = value;
};

export default useOnChange;
