import './styles.module.scss';
import BoxRowSection from 'components/Box/BoxRowSection';
import type { BoxRowSectionProps } from 'components/Box/BoxRowSection';

export type NotificationSettingGroupProps = BoxRowSectionProps;

const NotificationSettingGroup = ({ className, children, ...props }: NotificationSettingGroupProps) => (
	<BoxRowSection
		className={`notification-setting-group${className ? ` ${className}` : ''}`}
		{...props}
	>
		<div className="notification-setting-column-heading">
			Email
		</div>
		<div className="notification-setting-column-heading">
			Site
		</div>
		{children}
	</BoxRowSection>
);

export default NotificationSettingGroup;