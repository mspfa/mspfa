import './styles.module.scss';
import type { HTMLAttributes, LabelHTMLAttributes, ReactNode } from 'react';
import HelpButton from 'components/Button/HelpButton';

export type ExclusiveLabelProps = {
	/** Whether this label should be a block element on its own line. */
	block?: boolean,
	/** The `htmlFor` prop of the `label` element. If undefined, the label will instead be a `span`. */
	htmlFor?: LabelHTMLAttributes<HTMLLabelElement>['htmlFor'],
	/** Adds a help button next to the label which can be clicked to open a dialog with this value as its content. */
	help?: ReactNode,
	/** Content to insert directly before the label within the label container. */
	beforeLabel?: ReactNode,
	/** Content to insert directly after the label within the label container. */
	afterLabel?: ReactNode
};

export type LabelProps = HTMLAttributes<HTMLDivElement & HTMLSpanElement> & ExclusiveLabelProps;

const Label = ({ block, htmlFor, help, beforeLabel, afterLabel, className, children, ...props }: LabelProps) => {
	const LabelContainerTag = block ? 'div' : 'span';
	const LabelTag = htmlFor ? 'label' : 'span';

	return (
		<LabelContainerTag
			className={`label-container${className ? ` ${className}` : ''}`}
			{...props}
		>
			{beforeLabel}
			<LabelTag
				className="label spaced"
				htmlFor={htmlFor}
			>
				{children}
			</LabelTag>
			{afterLabel}
			{help && (
				<HelpButton
					className="spaced"
					subject={children}
				>
					{help}
				</HelpButton>
			)}
		</LabelContainerTag>
	);
};

export default Label;