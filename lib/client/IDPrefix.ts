import React, { useContext } from 'react';

/**
 * Sets a prefix on all automatically generated `id` attributes in components consuming this context.
 *
 * For example, if the context's value is `x`, and a consumer's unprefixed `id` is `y`, then the consumer's prefixed `id` is `x-y`.
 */
const IDPrefix = React.createContext<string | undefined>(undefined);

/** A hook that returns the inputted ID prefixed with the current value of the `IDPrefix` context. */
export const usePrefixedID = (id = '') => {
	const prefix = useContext(IDPrefix);

	return (prefix ? `${prefix}-` : '') + id;
};

export default IDPrefix;