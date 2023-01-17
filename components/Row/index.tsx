import './styles.module.scss';
import type { HTMLAttributes } from 'react';
import React from 'react';
import classes from 'lib/client/classes';

export type RowProps = HTMLAttributes<HTMLDivElement>;

/** A `div` with vertical margin between itself and its siblings. Spans all columns when placed in a `LabeledGrid`. */
const Row = React.forwardRef<HTMLDivElement, RowProps>(({
	className,
	...props
}, ref) => (
	<div
		className={classes('row', className)}
		{...props}
		ref={ref}
	/>
));

export default Row;
