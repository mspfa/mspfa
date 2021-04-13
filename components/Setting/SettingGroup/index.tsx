import GridHeading from 'components/Grid/GridHeading';
import GridContent from 'components/Grid/GridContent';
import type { GridContentProps } from 'components/Grid/GridContent';
import type { ReactNode } from 'react';
import './styles.module.scss';

export type SettingGroupProps = GridContentProps & {
	heading: ReactNode,
	/** `true` if this setting group is not a two-column settings group of labels on the left and inputs on the right, and it should not have `className="setting-group"`. */
	special?: boolean,
	/** Something displayed translucently at the top of the setting group's content. */
	info?: ReactNode
};

const SettingGroup = ({
	heading,
	special,
	className,
	info,
	children,
	...props
}: SettingGroupProps) => (
	<>
		<GridHeading>
			{heading}
		</GridHeading>
		<GridContent
			className={`setting-group${special ? '' : ' normal'}${className ? ` ${className}` : ''}`}
			{...props}
		>
			{info && (
				<div className="info translucent-text">
					{info}
				</div>
			)}
			{children}
		</GridContent>
	</>
);

export default SettingGroup;