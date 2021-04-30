import './styles.module.scss';
import type { HTMLAttributes, ReactNode } from 'react';

export type GridProps = HTMLAttributes<HTMLElement> & { children: ReactNode };

/** A nicely styled CSS grid `div` via `className="grid"`. */
const Grid = ({ className, ...props }: GridProps) => (
	<div
		className={`grid${className ? ` ${className}` : ''}`}
		{...props}
	/>
);

export default Grid;