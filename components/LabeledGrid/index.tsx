import './styles.module.scss';
import type { HTMLAttributes } from 'react';
import React from 'react';
import classes from 'lib/client/classes';

export type LabeledGridProps = HTMLAttributes<HTMLDivElement>;

/** A two-column grid of labeled rows. */
const LabeledGrid = React.forwardRef<HTMLDivElement, LabeledGridProps>(({
	className,
	...props
}, ref) => (
	<div
		className={classes('labeled-grid', className)}
		{...props}
		ref={ref}
	/>
));

export default LabeledGrid;
