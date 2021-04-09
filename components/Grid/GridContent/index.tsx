import type { HTMLAttributes, ReactNode } from 'react';
import './styles.module.scss';

export type GridContentProps = HTMLAttributes<HTMLDivElement>;

const GridContent = ({ className, ...props }: GridContentProps) => (
	<div
		className={`grid-content front${className ? ` ${className}` : ''}`}
		{...props}
	/>
);

export default GridContent;