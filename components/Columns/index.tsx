import './styles.module.scss';
import type { HTMLAttributes } from 'react';

export type ColumnsProps = HTMLAttributes<HTMLDivElement>;

/** A container which places its children in columns (or rows if on mobile). */
const Columns = ({ className, ...props }: ColumnsProps) => (
	<div
		className={`columns${className ? ` ${className}` : ''}`}
		{...props}
	/>
);

export default Columns;