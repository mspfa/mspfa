import GridSectionHeading from 'components/GridSection/GridSectionHeading';
import GridSubsection from 'components/GridSection/GridSubsection';
import type { GridSubsectionProps } from 'components/GridSection/GridSubsection';
import './styles.module.scss';

export type SettingGroupProps = GridSubsectionProps & {
	heading: string,
	/** Whether this setting group is a normal, two-column settings group of labels on the left and inputs on the right. */
	normal?: boolean
};

const SettingGroup = ({
	heading,
	normal = false,
	className,
	children,
	...props
}: SettingGroupProps) => (
	<>
		<GridSectionHeading>
			{heading}
		</GridSectionHeading>
		<GridSubsection
			className={(normal ? 'setting-group' : '') + (className ? ` ${className}` : '')}
			{...props}
		>
			{children}
		</GridSubsection>
	</>
);

export default SettingGroup;