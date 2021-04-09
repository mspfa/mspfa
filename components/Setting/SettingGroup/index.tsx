import GridHeading from 'components/Grid/GridHeading';
import GridContent from 'components/Grid/GridContent';
import type { GridContentProps } from 'components/Grid/GridContent';
import './styles.module.scss';

export type SettingGroupProps = GridContentProps & {
	heading: string
};

const SettingGroup = ({
	heading,
	className,
	...props
}: SettingGroupProps) => (
	<>
		<GridHeading>
			{heading}
		</GridHeading>
		<GridContent
			className={`setting-group${className ? ` ${className}` : ''}`}
			{...props}
		/>
	</>
);

export default SettingGroup;