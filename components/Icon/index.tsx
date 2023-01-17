import './styles.module.scss';
import type { HTMLAttributes } from 'react';
import classes from 'lib/client/classes';

export type IconProps = HTMLAttributes<HTMLDivElement>;

/** A 16x16 icon. If this has children, they will instead be inserted after the icon element, and the icon element will get a `labeled` class. */
const Icon = ({ children, className, ...props }: IconProps) => {
	const hasChildren = !(
		children === undefined
		|| children === null
		|| children === false
	);

	return (
		<>
			<div
				className={classes('icon', { labeled: hasChildren }, className)}
				{...props}
			/>
			{hasChildren && (
				<span className="icon-label">
					{children}
				</span>
			)}
		</>
	);
};

export default Icon;
