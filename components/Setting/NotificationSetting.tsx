import { Field } from 'formik';
import type { ExclusiveFieldBoxRowProps } from 'components/Box/FieldBoxRow';
import BoxRow from 'components/Box/LabeledBoxRow';

export type NotificationSettingProps = ExclusiveFieldBoxRowProps;

const NotificationSetting = ({ label, name, help }: NotificationSettingProps) => (
	<BoxRow
		label={label}
		help={help}
		customContent
	>
		<div className="box-row-content">
			<Field
				type="checkbox"
				name={`${name}.email`}
			/>
		</div>
		<div className="box-row-content">
			<Field
				type="checkbox"
				name={`${name}.site`}
			/>
		</div>
	</BoxRow>
);

export default NotificationSetting;