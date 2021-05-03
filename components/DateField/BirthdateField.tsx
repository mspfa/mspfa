import DateField from 'components/DateField';
import type { DateFieldProps } from 'components/DateField';

export type BirthdateFieldProps = Partial<DateFieldProps>;

/** A `DateField` for a user's birthdate. */
const BirthdateField = (props: BirthdateFieldProps) => {
	const now = new Date();

	return (
		<DateField
			name="birthdate"
			autoComplete="bday"
			min={
				// The minimum age is 13 years old.
				+new Date(now.getFullYear() - 200, now.getMonth(), now.getDate())
			}
			max={
				// The maximum age is 200 years old.
				+new Date(now.getFullYear() - 13, now.getMonth(), now.getDate())
				// Maybe in the distant future, when anyone can live that long, or when aliens with longer life spans use our internet, MSPFA will still be here.
			}
			{...props}
		/>
	);
};

export default BirthdateField;