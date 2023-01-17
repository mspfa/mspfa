import './styles.module.scss';
import type { HTMLAttributes } from 'react';
import classes from 'lib/client/classes';

export type InconspicuousDivProps = HTMLAttributes<HTMLDivElement>;

/** A `div` styled to be translucent, have a small font size, and have a link color the same as its text color. */
const InconspicuousDiv = ({ className, ...props }: InconspicuousDivProps) => (
	<div
		className={classes('inconspicuous', className)}
		{...props}
	/>
);

export default InconspicuousDiv;
