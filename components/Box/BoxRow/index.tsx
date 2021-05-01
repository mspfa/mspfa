import './styles.module.scss';
import type { HTMLAttributes } from 'react';

export type BoxRowProps = HTMLAttributes<HTMLDivElement>;

/** A centered row with one column that spans the full width of the box. */
const BoxRow = ({ className, ...props }: BoxRowProps) => (
	<div
		className={`box-row${className ? ` ${className}` : ''}`}
		{...props}
	/>
);

export default BoxRow;