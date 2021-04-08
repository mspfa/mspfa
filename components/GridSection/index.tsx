import type { HTMLAttributes, ReactNode } from 'react';
import './styles.module.scss';

export type GridSectionProps = HTMLAttributes<HTMLElement> & { children: ReactNode };

const GridSection = ({ className, children, ...props }: GridSectionProps) => (
	<section
		className={`grid-section${className ? ` ${className}` : ''}`}
		{...props}
	>
		{children}
	</section>
);

export default GridSection;