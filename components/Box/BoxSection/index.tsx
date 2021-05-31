import './styles.module.scss';
import type { HTMLAttributes, ReactNode } from 'react';

export type BoxSectionProps = HTMLAttributes<HTMLDivElement> & {
	heading?: ReactNode,
	collapsible?: boolean,
	open?: boolean,
	/** Whether this component's children should be inserted directly instead of inside a content element. */
	customContent?: boolean
};

/** A `Box` section with a heading and content below it.  */
const BoxSection = ({
	heading,
	className,
	collapsible,
	customContent,
	children,
	...props
}: BoxSectionProps) => {
	const SectionTag = collapsible ? 'details' : 'div';
	const HeadingTag = collapsible ? 'summary' : 'div';

	return (
		<SectionTag
			className={`box-section${className ? ` ${className}` : ''}`}
			{...props}
		>
			{heading && (
				<HeadingTag className="box-heading front-alt">
					{heading}
				</HeadingTag>
			)}
			{customContent ? (
				children
			) : (
				<div className="box-content front">
					{children}
				</div>
			)}
		</SectionTag>
	);
};

export default BoxSection;