import './styles.module.scss';
import LabeledGridBoxSection from 'components/Box/LabeledGridBoxSection';
import type { LabeledGridBoxSectionProps } from 'components/Box/LabeledGridBoxSection';

export type NotificationSettingGroupProps = LabeledGridBoxSectionProps;

const NotificationSettingGroup = ({ className, children, ...props }: NotificationSettingGroupProps) => (
	<LabeledGridBoxSection
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
	</LabeledGridBoxSection>
);

export default NotificationSettingGroup;