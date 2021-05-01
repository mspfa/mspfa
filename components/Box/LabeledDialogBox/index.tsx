import './styles.module.scss';
import type { HTMLAttributes } from 'react';

export type LabeledDialogBoxProps = HTMLAttributes<HTMLDivElement>;

/** A two-column grid of labeled rows for use within a `Dialog`'s `content`. */
const LabeledDialogBox = ({ className, ...props }: LabeledDialogBoxProps) => (
	<div
		className={`labeled-dialog-box${className ? ` ${className}` : ''}`}
		{...props}
	/>
);

export default LabeledDialogBox;