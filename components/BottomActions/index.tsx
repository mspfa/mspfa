import './styles.module.scss';
import type { HTMLAttributes } from 'react';
import classes from 'lib/client/classes';

export type BottomActionsProps = HTMLAttributes<HTMLDivElement>;

/**
 * An area at the bottom of the page containing various actions.
 *
 * ⚠️ Consider using `TopActions` instead, because then the user knows what actions there are without scrolling to or looking at the bottom, and it's more conveniently accessible due to being sticky.
 */
const BottomActions = ({ className, ...props }: BottomActionsProps) => (
	<div
		className={classes('bottom-actions', className)}
		{...props}
	/>
);

export default BottomActions;
