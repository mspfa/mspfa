import GridHeading from 'components/Grid/GridHeading';
import GridContent from 'components/Grid/GridContent';
import type { GridContentProps } from 'components/Grid/GridContent';
import './styles.module.scss';

export type SettingGroupProps = GridContentProps & {
	heading: string,
	/** Whether this setting group is a normal, two-column settings group of labels on the left and inputs on the right. */
	normal?: boolean
};

const SettingGroup = ({
	heading,
	normal = false,
	className,
	...props
}: SettingGroupProps) => (
	<>
		<GridHeading>
			{heading}
		</GridHeading>
		<GridContent
			className={(normal ? 'setting-group' : '') + (className ? ` ${className}` : '')}
			{...props}
		/>
	</>
);

export default SettingGroup;