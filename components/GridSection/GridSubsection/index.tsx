import type { HTMLAttributes, ReactNode } from 'react';
import './styles.module.scss';

export type GridSubsectionProps = HTMLAttributes<HTMLDivElement> & { children: ReactNode };

const GridSubsection = ({ children, className, ...props }: GridSubsectionProps) => (
	<div
		className={`grid-subsection layer-front ${className ? ` ${className}` : ''}`}
		{...props}
	>
		{children}
	</div>
);

export default GridSubsection;