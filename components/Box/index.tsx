import './styles.module.scss';
import type { HTMLAttributes, ReactNode } from 'react';

export type BoxProps = HTMLAttributes<HTMLDivElement> & { children: ReactNode };

/** A convenient-to-use flexbox. */
const Box = ({ className, ...props }: BoxProps) => (
	<div
		className={`box${className ? ` ${className}` : ''}`}
		{...props}
	/>
);

export default Box;