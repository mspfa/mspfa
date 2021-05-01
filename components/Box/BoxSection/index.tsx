import './styles.module.scss';
import type { HTMLAttributes, ReactNode } from 'react';

export type BoxSectionProps = HTMLAttributes<HTMLDivElement> & {
	heading: ReactNode
};

/** A `Box` section with a heading and content below it.  */
const BoxSection = ({
	heading,
	className,
	...props
}: BoxSectionProps) => (
	<div className="box-section">
		<div className="box-heading front-alt">
			{heading}
		</div>
		<div
			className={`box-content front${className ? ` ${className}` : ''}`}
			{...props}
		/>
	</div>
);

export default BoxSection;