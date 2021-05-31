import './styles.module.scss';
import type { HTMLAttributes } from 'react';

export type RowProps = HTMLAttributes<HTMLDivElement>;

/** A div with margin between itself and its siblings. */
const Row = ({ className, ...props }: RowProps) => (
	<div
		className={`row${className ? ` ${className}` : ''}`}
		{...props}
	/>
);

export default Row;