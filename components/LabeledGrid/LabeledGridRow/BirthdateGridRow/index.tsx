import EditButton from 'components/Button/EditButton';
import BirthdateField from 'components/DateField/BirthdateField';
import LabeledGridRow from 'components/LabeledGrid/LabeledGridRow';
import Timestamp from 'components/Timestamp';
import { useField } from 'formik';
import Dialog from 'lib/client/Dialog';
import useFunction from 'lib/client/reactHooks/useFunction';
import type { ServerUser } from 'lib/server/users';
import type { DateNumber } from 'lib/types';
import { useState } from 'react';

export type BirthdateGridRowProps = Pick<ServerUser, 'birthdateChanged'>;

/** A `LabeledGridRow` for a user's birthdate which can be edited as a `BirthdateField` only once. */
const BirthdateGridRow = ({ birthdateChanged }: BirthdateGridRowProps) => {
	const [, { value }] = useField<DateNumber>('birthdate');

	const [editingBirthdate, setEditingBirthdate] = useState(false);

	const editBirthdate = useFunction(async () => {
		if (!await Dialog.confirm({
			id: 'edit-birthdate',
			title: 'Edit Birthdate',
			content: 'You can only change your birthdate once.\n\nOnce changed, it cannot be undone.\n\nAre you sure you want to edit your birthdate?'
		})) {
			return;
		}

		setEditingBirthdate(true);
	});

	if (editingBirthdate && birthdateChanged) {
		// The user was editing the birthdate but then submitted the changes, so editing should now be disabled.
		setEditingBirthdate(false);
	}

	return (
		<LabeledGridRow
			htmlFor={editingBirthdate ? 'field-birthdate-year' : ''}
			label="Birthdate"
		>
			{editingBirthdate ? (
				<BirthdateField required />
			) : (
				<>
					<Timestamp className="spaced">
						{value}
					</Timestamp>
					{!birthdateChanged && (
						<EditButton
							className="spaced"
							title="Edit Birthdate"
							onClick={editBirthdate}
						/>
					)}
				</>
			)}
		</LabeledGridRow>
	);
};

export default BirthdateGridRow;