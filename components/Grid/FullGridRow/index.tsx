import type { HTMLAttributes } from 'react';
import './styles.module.scss';

export type FullGridRowProps = HTMLAttributes<HTMLDivElement>;

/** A grid row with one column that spans the full width of the grid. */
const FullGridRow = ({ className, ...props }: FullGridRowProps) => (
	<div
		className={`full-grid-row${className ? ` ${className}` : ''}`}
		{...props}
	/>
);

export default FullGridRow;