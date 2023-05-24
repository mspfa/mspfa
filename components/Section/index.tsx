import './styles.module.scss';
import type { DetailsHTMLAttributes, HTMLAttributes, ReactNode } from 'react';
import React, { useState } from 'react';
import classes from 'lib/client/classes';
import useFunction from 'lib/client/reactHooks/useFunction';

export type SectionProps = HTMLAttributes<HTMLDivElement> & DetailsHTMLAttributes<HTMLDetailsElement> & {
	heading?: ReactNode,
	/** Whether this component's children should be inserted directly instead of inside a content element. */
	customContent?: boolean
} & (
	{
		collapsible: true,
		defaultOpen?: boolean
	} | {
		collapsible?: false,
		defaultOpen?: never
	}
);

/** A section with a heading box and a content box. */
const Section = React.forwardRef<HTMLDivElement & HTMLDetailsElement, SectionProps>(({
	heading,
	className,
	collapsible,
	defaultOpen,
	customContent,
	children,
	...props
}, ref) => {
	// We can't use `details` and `summary` for collapsible sections because the `details` element uses slots for its children, which makes `flex-grow` not work properly.
	const HeadingTag = collapsible ? 'button' : 'div';

	const [open, setOpen] = useState(defaultOpen);
	const contentVisible = !collapsible || open;

	const handleHeadingClick = useFunction(() => {
		if (!collapsible) {
			return;
		}

		setOpen(open => !open);
	});

	return (
		<div
			className={classes('section', { collapsible, open }, className)}
			{...props}
			ref={ref}
		>
			{heading && (
				<HeadingTag
					className="section-heading alt-front"
					onClick={handleHeadingClick}
				>
					{heading}
				</HeadingTag>
			)}
			{contentVisible && (
				customContent ? (
					children
				) : (
					<div className="section-content front">
						{children}
					</div>
				)
			)}
		</div>
	);
});

export default Section;
