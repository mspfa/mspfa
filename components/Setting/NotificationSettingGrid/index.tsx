import './styles.module.scss';
import LabeledGrid from 'components/LabeledGrid';
import type { LabeledGridSectionProps } from 'components/Section/LabeledGridSection';
import classNames from 'classnames';

export type NotificationSettingGridProps = LabeledGridSectionProps;

/** A `LabeledGrid` for `NotificationSetting`s. */
const NotificationSettingGrid = ({ className, children, ...props }: NotificationSettingGridProps) => (
	<LabeledGrid
		className={classNames('notification-setting-grid', className)}
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
