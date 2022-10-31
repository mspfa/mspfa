import './styles.module.scss';
import type { HTMLAttributes } from 'react';
import classNames from 'classnames';

export type BottomActionsProps = HTMLAttributes<HTMLDivElement>;

/** An area at the bottom of the page containing various actions relating to the page in general. */
const BottomActions = ({ className, ...props }: BottomActionsProps) => (
	<div
		className={classNames('bottom-actions', className)}
		{...props}
	/>
);

export default BottomActions;
