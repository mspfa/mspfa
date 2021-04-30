import './styles.module.scss';
import type { HTMLAttributes } from 'react';

export type GridRowProps = HTMLAttributes<HTMLDivElement>;

/** A grid row with one column that spans the full width of the grid. */
const GridRow = ({ className, ...props }: GridRowProps) => (
	<div
		className={`grid-row${className ? ` ${className}` : ''}`}
		{...props}
	/>
);

export default GridRow;