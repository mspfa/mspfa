import './styles.module.scss';
import type { HTMLAttributes } from 'react';

export type LabeledIconProps = HTMLAttributes<HTMLSpanElement>;

const LabeledIcon = ({ className, ...props }: LabeledIconProps) => (
	<span
		className={`labeled-icon${className ? ` ${className}` : ''}`}
		{...props}
	/>
);

export default LabeledIcon;