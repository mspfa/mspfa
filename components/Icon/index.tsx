import './styles.module.scss';
import type { HTMLAttributes } from 'react';

export type IconProps = HTMLAttributes<HTMLDivElement>;

/** A 16x16 icon. If this has children, they will instead be inserted after the icon element, and the icon element will get a `labeled` class. */
const Icon = ({ children, className, ...props }: IconProps) => (
	<>
		<div
			className={
				`icon${
					children === undefined
					|| children === null
					|| children === false
						? ''
						: ' labeled'
				}${
					className ? ` ${className}` : ''
				}`
			}
			{...props}
		/>
		<span className="icon-label">
			{children}
		</span>
	</>
);

export default Icon;