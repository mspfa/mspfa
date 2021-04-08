import type { HTMLAttributes, ReactNode } from 'react';
import './styles.module.scss';

export type GridSectionHeadingProps = HTMLAttributes<HTMLDivElement> & { children: ReactNode };

const GridSectionHeading = ({ className, children, ...props }: GridSectionHeadingProps) => (
	<div
		className={`grid-section-heading layer-front bolder${className ? ` ${className}` : ''}`}
		{...props}
	>
		{children}
	</div>
);

export default GridSectionHeading;