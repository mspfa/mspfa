import { Field } from 'formik';
import type { ExclusiveSettingProps } from 'components/Setting';
import type { FieldAttributes } from 'formik';
import HelpButton from 'components/Button/HelpButton';

export type NotificationSettingProps = ExclusiveSettingProps & {
	emailFieldProps?: Partial<FieldAttributes<unknown>>,
	siteFieldProps?: Partial<FieldAttributes<unknown>>
};

const NotificationSetting = ({
	label,
	name,
	help,
	emailFieldProps,
	siteFieldProps
}: NotificationSettingProps) => (
	<>
		<span className="setting-label">
			{label}
			{help && (
				<HelpButton className="spaced">
					{label}:<br />
					<br />
					{help}
				</HelpButton>
			)}
		</span>
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