import GridSection from 'components/Grid/GridSection';
import type { GridSectionProps } from 'components/Grid/GridSection';
import './styles.module.scss';

export type NotificationSettingGroupProps = GridSectionProps;

const NotificationSettingGroup = ({
	className,
	children,
	...props
}: NotificationSettingGroupProps) => (
	<GridSection
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
	</GridSection>
);

export default NotificationSettingGroup;