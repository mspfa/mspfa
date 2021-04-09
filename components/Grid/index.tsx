import type { HTMLAttributes, ReactNode } from 'react';
import './styles.module.scss';

export type GridProps = HTMLAttributes<HTMLElement> & { children: ReactNode };

const Grid = ({ className, ...props }: GridProps) => (
	<div
		className={`grid${className ? ` ${className}` : ''}`}
		{...props}
	/>
);

export default Grid;