import './styles.module.scss';
import type { HTMLAttributes, ReactNode } from 'react';
import React from 'react';

export type SectionProps = HTMLAttributes<HTMLDivElement> & {
	heading?: ReactNode,
	collapsible?: boolean,
	open?: boolean,
	/** Whether this component's children should be inserted directly instead of inside a content element. */
	customContent?: boolean
};

/** A section with a heading box and a content box. */
const Section = React.forwardRef<HTMLDivElement, SectionProps>(({
	heading,
	className,
	collapsible,
	customContent,
	children,
	...props
}, ref) => {
	const SectionTag = collapsible ? 'details' : 'div';
	const HeadingTag = collapsible ? 'summary' : 'div';

	return (
		<SectionTag
			className={`section${className ? ` ${className}` : ''}`}
			{...props}
			ref={ref}
		>
			{heading && (
				<HeadingTag className="section-heading alt-front">
					{heading}
				</HeadingTag>
			)}
			{customContent ? (
				children
			) : (
				<div className="section-content front">
					{children}
				</div>
			)}
		</SectionTag>
	);
});

export default Section;