import './styles.module.scss';
import type { HTMLAttributes, ReactNode } from 'react';
import Label from 'components/Label';
import type { ExclusiveLabelProps } from 'components/Label';

type DivPropsWithoutChildren = Omit<HTMLAttributes<HTMLDivElement>, 'children'>;

export type LabeledGridRowProps = ExclusiveLabelProps & {
	/** The content of the row's label. */
	label: ReactNode,
	/** Whether this component's children should be inserted directly instead of inside a content element. */
	customContent?: boolean,
	labelProps?: DivPropsWithoutChildren,
	contentProps?: DivPropsWithoutChildren,
	children: ReactNode
};

/** A row in a grid with a label on the left and content on the right. */
const LabeledGridRow = ({
	label,
	htmlFor,
	help,
	afterLabel,
	customContent,
	labelProps: {
		className: labelClassName,
		...labelProps
	} = {},
	contentProps: {
		className: contentClassName,
		...contentProps
	} = {},
	children
}: LabeledGridRowProps) => (
	<>
		<Label
			className={`grid-row-label${labelClassName ? ` ${labelClassName}` : ''}`}
			htmlFor={htmlFor}
			help={help}
			afterLabel={afterLabel}
			{...labelProps}
		>
			{label}
		</Label>
		{customContent ? (
			children
		) : (
			<div
				className={`grid-row-content${contentClassName ? ` ${contentClassName}` : ''}`}
				{...contentProps}
			>
				{children}
			</div>
		)}
	</>
);

export default LabeledGridRow;