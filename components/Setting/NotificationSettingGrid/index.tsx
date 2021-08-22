import './styles.module.scss';
import LabeledGrid from 'components/LabeledGrid';
import type { LabeledGridBoxSectionProps } from 'components/Box/LabeledGridBoxSection';

export type NotificationSettingGridProps = LabeledGridBoxSectionProps;

/** A `LabeledGrid` for `NotificationSetting`s. */
const NotificationSettingGrid = ({ className, children, ...props }: NotificationSettingGridProps) => (
	<LabeledGrid
		className={`notification-setting-grid${className ? ` ${className}` : ''}`}
		{...props}
	>
		<div className="notification-setting-grid-heading">
			Email
		</div>
		<div className="notification-setting-grid-heading">
			Site
		</div>
		{children}
	</LabeledGrid>
);

export default NotificationSettingGrid;