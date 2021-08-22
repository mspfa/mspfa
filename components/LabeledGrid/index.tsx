import './styles.module.scss';
import type { HTMLAttributes } from 'react';

export type LabeledGridProps = HTMLAttributes<HTMLDivElement>;

/** A two-column grid of labeled rows. */
const LabeledGrid = ({ className, ...props }: LabeledGridProps) => (
	<div
		className={`labeled-grid${className ? ` ${className}` : ''}`}
		{...props}
	/>
);

export default LabeledGrid;