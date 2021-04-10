import type { HTMLAttributes } from 'react';
import './styles.module.scss';

export type GridFooterProps = HTMLAttributes<HTMLDivElement>;

const GridFooter = ({ className, ...props }: GridFooterProps) => (
	<div
		className={`grid-footer${className ? ` ${className}` : ''}`}
		{...props}
	/>
);

export default GridFooter;