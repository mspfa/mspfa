import './styles.module.scss';
import type { HTMLAttributes } from 'react';
import React from 'react';
import classNames from 'classnames';

export type LabeledGridProps = HTMLAttributes<HTMLDivElement>;

/** A two-column grid of labeled rows. */
const LabeledGrid = React.forwardRef<HTMLDivElement, LabeledGridProps>(({
	className,
	...props
}, ref) => (
	<div
		className={classNames('labeled-grid', className)}
		{...props}
		ref={ref}
	/>
));

export default LabeledGrid;
