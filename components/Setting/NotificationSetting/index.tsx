import { Field } from 'formik';
import type { ExclusiveSettingProps } from 'components/Setting';
import type { FieldAttributes } from 'formik';
import './styles.module.scss';

export type NotificationSettingProps = ExclusiveSettingProps & {
	emailFieldProps?: Partial<FieldAttributes<unknown>>,
	siteFieldProps?: Partial<FieldAttributes<unknown>>
};

const NotificationSetting = ({
	label,
	name,
	emailFieldProps,
	siteFieldProps
}: NotificationSettingProps) => (
	<>
		<label className="setting-label">
			{label}
		</label>
		<div className="setting-input">
			<Field
				name={`${name}.email`}
				type="checkbox"
				{...emailFieldProps}
			/>
		</div>
		<div className="setting-input">
			<Field
				name={`${name}.site`}
				type="checkbox"
				{...siteFieldProps}
			/>
		</div>
	</>
);

export default NotificationSetting;