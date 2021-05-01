import './styles.module.scss';
import type { HTMLAttributes } from 'react';

export type BoxFooterProps = HTMLAttributes<HTMLDivElement>;

/** An optional section placed at the bottom of a `Box`, usually containing buttons such as "Save". */
const BoxFooter = ({ className, ...props }: BoxFooterProps) => (
	<div
		className={`box-footer${className ? ` ${className}` : ''}`}
		{...props}
	/>
);

export default BoxFooter;