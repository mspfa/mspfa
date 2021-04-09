import { Field } from 'formik';
import type { ExclusiveSettingProps } from 'components/Setting';
import './styles.module.scss';

export type NotificationSettingProps = ExclusiveSettingProps;

const NotificationSetting = ({
	label,
	name
}: NotificationSettingProps) => (
	<>
		<label className="setting-label">
			{label}
		</label>
		<div className="setting-input">
			<Field
				name="notifications."
				type="checkbox"
			/>
		</div>
		<div className="setting-input">
			<Field
				name="notifications."
				type="checkbox"
			/>
		</div>
	</>
);

export default NotificationSetting;