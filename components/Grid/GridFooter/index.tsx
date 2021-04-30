import './styles.module.scss';
import type { HTMLAttributes } from 'react';

export type GridFooterProps = HTMLAttributes<HTMLDivElement>;

/** An optional section placed at the bottom of a `Grid`, usually containing buttons such as "Save". */
const GridFooter = ({ className, ...props }: GridFooterProps) => (
	<div
		className={`grid-footer${className ? ` ${className}` : ''}`}
		{...props}
	/>
);

export default GridFooter;