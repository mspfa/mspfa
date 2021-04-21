import { Field } from 'formik';
import type { ExclusiveFieldGridRowProps } from 'components/Grid/FieldGridRow';
import GridRow from 'components/Grid/LabeledGridRow';

export type NotificationSettingProps = ExclusiveFieldGridRowProps;

const NotificationSetting = ({ label, name, help }: NotificationSettingProps) => (
	<GridRow
		label={label}
		help={help}
		customContent
	>
		<div className="grid-row-content">
			<Field
				name={`${name}.email`}
				type="checkbox"
			/>
		</div>
		<div className="grid-row-content">
			<Field
				name={`${name}.site`}
				type="checkbox"
			/>
		</div>
	</GridRow>
);

export default NotificationSetting;