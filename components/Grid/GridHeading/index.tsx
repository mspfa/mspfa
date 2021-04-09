import type { HTMLAttributes } from 'react';
import './styles.module.scss';

export type GridHeadingProps = HTMLAttributes<HTMLDivElement>;

const GridHeading = ({ className, ...props }: GridHeadingProps) => (
	<div
		className={`grid-heading front-alt${className ? ` ${className}` : ''}`}
		{...props}
	/>
);

export default GridHeading;