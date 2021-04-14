import type { HTMLAttributes, LabelHTMLAttributes, ReactNode } from 'react';
import HelpButton from 'components/Button/HelpButton';
import './styles.module.scss';

export type LabelProps = HTMLAttributes<HTMLDivElement> & {
	/** The `htmlFor` prop of the `label` element. If undefined, the label will instead be a `span`. */
	htmlFor?: LabelHTMLAttributes<HTMLLabelElement>['htmlFor'],
	/** Adds a help button next to the label which can be clicked to open a dialog with this value as its content. */
	help?: ReactNode
};

const Label = ({ htmlFor, help, className, children, ...props }: LabelProps) => (
	<div
		className={`label-container${className ? ` ${className}` : ''}`}
		{...props}
	>
		{htmlFor ? (
			<label className="label" htmlFor={htmlFor}>
				{children}
			</label>
		) : (
			<span className="label">
				{children}
			</span>
		)}
		{help && (
			<HelpButton className="spaced">
				{children}:<br />
				<br />
				{help}
			</HelpButton>
		)}
	</div>
);

export default Label;