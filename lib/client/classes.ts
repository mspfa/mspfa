import classNames from 'classnames';

/**
 * A simple utility for joining `className`s together.
 *
 * Always use this instead of the `classnames` package, because this returns `undefined` instead of `''` when there are no classes.
 */
const classes = (...args: Parameters<typeof classNames>) => (
	classNames(...args) || undefined
);

export default classes;
