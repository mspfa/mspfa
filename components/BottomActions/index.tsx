import './styles.module.scss';
import type { HTMLAttributes } from 'react';

export type BottomActionsProps = HTMLAttributes<HTMLDivElement>;

/** An area at the bottom of the page containing various actions relating to the page in general. */
const BottomActions = ({ className, ...props }: BottomActionsProps) => (
	<div
		className={`bottom-actions${className ? ` ${className}` : ''}`}
		{...props}
	/>
);

export default BottomActions;