import type { HTMLAttributes, LabelHTMLAttributes, ReactNode } from 'react';
import HelpButton from 'components/Button/HelpButton';
import './styles.module.scss';

type DivPropsWithoutChildren = Omit<HTMLAttributes<HTMLDivElement>, 'children'>;

export type GridRowProps = {
	/** The content of the row's label. */
	label: ReactNode,
	/** The `htmlFor` prop of the `label` element. If undefined, the label will instead be a `span`. */
	htmlFor?: LabelHTMLAttributes<HTMLLabelElement>['htmlFor'],
	/** Adds a help button next to the label which can be clicked to open a dialog with this value as its content. */
	help?: ReactNode,
	/** Whether this component's children should be inserted directly instead of inside a content element. */
	customContent?: boolean,
	labelContainerProps?: DivPropsWithoutChildren,
	contentProps?: DivPropsWithoutChildren,
	children: ReactNode
};

/** A row in a grid with a label on the left and content on the right. */
const GridRow = ({
	label,
	htmlFor,
	help,
	customContent,
	labelContainerProps: {
		className: labelContainerClassName,
		...labelContainerProps
	} = {},
	contentProps: {
		className: contentClassName,
		...contentProps
	} = {},
	children
}: GridRowProps) => (
	<>
		<div
			className={`grid-row-label-container${labelContainerClassName ? ` ${labelContainerClassName}` : ''}`}
			{...labelContainerProps}
		>
			{htmlFor ? (
				<label className="grid-row-label" htmlFor={htmlFor}>
					{label}
				</label>
			) : (
				<span className="grid-row-label">
					{label}
				</span>
			)}
			{help && (
				<HelpButton className="spaced">
					{label}:<br />
					<br />
					{help}
				</HelpButton>
			)}
		</div>
		{(customContent
			? children
			: (
				<div
					className={`grid-row-content${contentClassName ? ` ${contentClassName}` : ''}`}
					{...contentProps}
				>
					{children}
				</div>
			)
		)}
	</>
);

export default GridRow;