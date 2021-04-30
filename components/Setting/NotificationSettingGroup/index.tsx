import './styles.module.scss';
import GridRowSection from 'components/Grid/GridRowSection';
import type { GridRowSectionProps } from 'components/Grid/GridRowSection';

export type NotificationSettingGroupProps = GridRowSectionProps;

const NotificationSettingGroup = ({ className, children, ...props }: NotificationSettingGroupProps) => (
	<GridRowSection
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
	</GridRowSection>
);

export default NotificationSettingGroup;