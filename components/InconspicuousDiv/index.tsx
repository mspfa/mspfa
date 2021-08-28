import './styles.module.scss';
import type { HTMLAttributes } from 'react';

export type InconspicuousDivProps = HTMLAttributes<HTMLDivElement>;

/** A `div` styled to be translucent, have a small font size, and have a link color the same as its text color. */
const InconspicuousDiv = ({ className, ...props }: InconspicuousDivProps) => (
	<div
		className={`inconspicuous${className ? ` ${className}` : ''}`}
		{...props}
	/>
);

export default InconspicuousDiv;