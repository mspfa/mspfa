import type { FormikProps } from 'formik';
import FieldGridRow from 'components/Grid/FieldGridRow';
import { toPattern } from 'modules/client/utilities';
import LabeledDialogGrid from 'components/Grid/LabeledDialogGrid';

export type PasswordFieldGridValues = {
	currentPassword: string,
	password: string,
	confirmPassword: string
};

export type PasswordFieldGridProps = FormikProps<PasswordFieldGridValues>;

const PasswordFieldGrid = ({ values }: PasswordFieldGridProps) => (
	<LabeledDialogGrid>
		<FieldGridRow
			name="currentPassword"
			type="password"
			autoComplete="current-password"
			required
			minLength={8}
			label="Current Password"
			autoFocus
		/>
		<FieldGridRow
			name="password"
			type="password"
			autoComplete="new-password"
			required
			minLength={8}
			label="New Password"
		/>
		<FieldGridRow
			name="confirmPassword"
			type="password"
			autoComplete="new-password"
			required
			placeholder="Re-Type Password"
			pattern={toPattern(values.password)}
			label="Confirm"
		/>
	</LabeledDialogGrid>
);

export default PasswordFieldGrid;