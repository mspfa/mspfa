import './styles.module.scss';
import type { HTMLAttributes, LabelHTMLAttributes, ReactNode } from 'react';
import HelpButton from 'components/Button/HelpButton';

export type ExclusiveLabelProps = {
	/** Whether this label should be a block element on its own line. */
	block?: boolean,
	/** The `htmlFor` prop of the `label` element. If undefined, the label will instead be a `span`. */
	htmlFor?: LabelHTMLAttributes<HTMLLabelElement>['htmlFor'],
	/** Adds a help button next to the label which can be clicked to open a dialog with this value as its content. */
	help?: ReactNode
};

export type LabelProps = HTMLAttributes<HTMLDivElement> & ExclusiveLabelProps;

const Label = ({ block, htmlFor, help, className, children, ...props }: LabelProps) => {
	const LabelTag = htmlFor ? 'label' : 'span';

	return (
		<span
			className={`label-container${block ? ' block' : ''}${className ? ` ${className}` : ''}`}
			{...props}
		>
			<LabelTag className="label spaced" htmlFor={htmlFor}>
				{children}
			</LabelTag>
			{help && (
				<HelpButton className="spaced">
					{children}:<br />
					<br />
					{help}
				</HelpButton>
			)}
		</span>
	);
};

export default Label;