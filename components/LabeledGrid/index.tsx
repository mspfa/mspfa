import './styles.module.scss';
import type { HTMLAttributes } from 'react';
import React from 'react';

export type LabeledGridProps = HTMLAttributes<HTMLDivElement>;

/** A two-column grid of labeled rows. */
const LabeledGrid = React.forwardRef<HTMLDivElement>((
	{ className, ...props }: LabeledGridProps,
	ref
) => (
	<div
		className={`labeled-grid${className ? ` ${className}` : ''}`}
		{...props}
		ref={ref}
	/>
));

export default LabeledGrid;