import './styles.module.scss';
import type { HTMLAttributes, ReactNode } from 'react';
import React from 'react';

export type BoxSectionProps = HTMLAttributes<HTMLDivElement> & {
	heading?: ReactNode,
	collapsible?: boolean,
	open?: boolean,
	/** Whether this component's children should be inserted directly instead of inside a content element. */
	customContent?: boolean
};

/** A `Box` section with a heading and content. Should always be placed in a `Box`. */
const BoxSection = React.forwardRef<HTMLDivElement, BoxSectionProps>(({
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
			className={`box-section${className ? ` ${className}` : ''}`}
			{...props}
			ref={ref}
		>
			{heading && (
				<HeadingTag className="box-section-heading alt-front">
					{heading}
				</HeadingTag>
			)}
			{customContent ? (
				children
			) : (
				<div className="box-section-content front">
					{children}
				</div>
			)}
		</SectionTag>
	);
});

export default BoxSection;