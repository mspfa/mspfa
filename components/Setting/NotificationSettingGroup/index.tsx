import SettingGroup from 'components/Setting/SettingGroup';
import type { SettingGroupProps } from 'components/Setting/SettingGroup';
import './styles.module.scss';

export type NotificationSettingGroupProps = SettingGroupProps;

const NotificationSettingGroup = ({
	className,
	children,
	...props
}: NotificationSettingGroupProps) => (
	<SettingGroup
		className={`notification-setting-group${className ? ` ${className}` : ''}`}
		special
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
	</SettingGroup>
);

export default NotificationSettingGroup;