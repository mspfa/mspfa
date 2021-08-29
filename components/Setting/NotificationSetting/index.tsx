import { Field } from 'formik';
import type { ExclusiveLabeledGridFieldProps } from 'components/LabeledGrid/LabeledGridField';
import LabeledGridRow from 'components/LabeledGrid/LabeledGridRow';

export type NotificationSettingProps = ExclusiveLabeledGridFieldProps;

/** A `LabeledGridRow` to be placed in a `NotificationSettingGrid` containing a `Field` for a notification setting. */
const NotificationSetting = ({ label, name, help }: NotificationSettingProps) => (
	<LabeledGridRow
		label={label}
		help={help}
		customContent
	>
		<div className="grid-row-content">
			<Field
				type="checkbox"
				name={`${name}.email`}
			/>
		</div>
		<div className="grid-row-content">
			<Field
				type="checkbox"
				name={`${name}.site`}
			/>
		</div>
	</LabeledGridRow>
);

export default NotificationSetting;