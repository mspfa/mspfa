import './styles.module.scss';
import type { HTMLAttributes, ReactNode } from 'react';

export type BoxColumnsProps = HTMLAttributes<HTMLDivElement> & { children: ReactNode };

/** A container which places its children in columns (or rows if on mobile). */
const BoxColumns = ({ className, ...props }: BoxColumnsProps) => (
	<div
		className={`box-columns${className ? ` ${className}` : ''}`}
		{...props}
	/>
);

export default BoxColumns;