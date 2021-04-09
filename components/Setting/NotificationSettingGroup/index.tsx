import GridHeading from 'components/Grid/GridHeading';
import GridContent from 'components/Grid/GridContent';
import type { SettingGroupProps } from 'components/Setting/SettingGroup';
import './styles.module.scss';

export type NotificationSettingGroupProps = SettingGroupProps;

const NotificationSettingGroup = ({
	heading,
	className,
	children,
	...props
}: NotificationSettingGroupProps) => (
	<>
		<GridHeading>
			{heading}
		</GridHeading>
		<GridContent
			className={`notification-setting-group${className ? ` ${className}` : ''}`}
			{...props}
		>
			<div className="notification-setting-container">
				<div className="notification-setting-column-heading">
					Email
				</div>
				<div className="notification-setting-column-heading">
					Site
				</div>
				{children}
			</div>
		</GridContent>
	</>
);

export default NotificationSettingGroup;