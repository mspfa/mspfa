import './styles.module.scss';
import type { HTMLAttributes } from 'react';
import classes from 'lib/client/classes';

export type BottomActionsProps = HTMLAttributes<HTMLDivElement>;

/** An area at the bottom of the page containing various actions relating to the page in general. */
const BottomActions = ({ className, ...props }: BottomActionsProps) => (
	<div
		className={classes('bottom-actions', className)}
		{...props}
	/>
);

export default BottomActions;
