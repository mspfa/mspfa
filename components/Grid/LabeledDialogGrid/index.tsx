import type { HTMLAttributes } from 'react';
import './styles.module.scss';

export type LabeledDialogGridProps = HTMLAttributes<HTMLDivElement>;

/** A two-column grid of labeled rows for use within a `Dialog`'s `content`. */
const LabeledDialogGrid = ({ className, ...props }: LabeledDialogGridProps) => (
	<div
		className={`labeled-dialog-grid${className ? ` ${className}` : ''}`}
		{...props}
	/>
);

export default LabeledDialogGrid;