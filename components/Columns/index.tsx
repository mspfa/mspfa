import './styles.module.scss';
import type { HTMLAttributes } from 'react';

export type ColumnsProps = HTMLAttributes<HTMLDivElement> & {
	/** Whether this element's columns are made of `Section`s and should thus be separated by standard `Section` margins rather than by `1em`. */
	ofSections?: boolean
};

/** A container which places its children in columns (or rows if on mobile). */
const Columns = ({ className, ofSections, ...props }: ColumnsProps) => (
	<div
		className={`columns${ofSections ? ' of-sections' : ''}${className ? ` ${className}` : ''}`}
		{...props}
	/>
);

export default Columns;