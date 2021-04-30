import './styles.module.scss';
import type { HTMLAttributes, ReactNode } from 'react';

export type GridSectionProps = HTMLAttributes<HTMLDivElement> & {
	heading: ReactNode
};

/** A `Grid` section with a heading and content below it.  */
const GridSection = ({
	heading,
	className,
	...props
}: GridSectionProps) => (
	<>
		<div className="grid-heading front-alt">
			{heading}
		</div>
		<div
			className={`grid-content front${className ? ` ${className}` : ''}`}
			{...props}
		/>
	</>
);

export default GridSection;