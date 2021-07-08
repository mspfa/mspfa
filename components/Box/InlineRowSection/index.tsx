import './styles.module.scss';
import type { HTMLAttributes } from 'react';

export type InlineRowSectionProps = HTMLAttributes<HTMLDivElement>;

/** A two-column grid of labeled rows for use within a `Dialog`'s `content`. */
const InlineRowSection = ({ className, ...props }: InlineRowSectionProps) => (
	<div
		className={`inline-row-section${className ? ` ${className}` : ''}`}
		{...props}
	/>
);

export default InlineRowSection;