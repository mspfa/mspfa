import './styles.module.scss';
import { useField } from 'formik';
import type { InputHTMLAttributes } from 'react';
import { useMemo, useRef } from 'react';
import UserField from 'components/UserField';
import AddUserButton from 'components/UserField/AddUserButton';
import type { integer } from 'lib/types';
import classes from 'lib/client/classes';

export type UserArrayFieldProps = Pick<InputHTMLAttributes<HTMLInputElement>, 'required' | 'readOnly' | 'autoFocus' | 'className'> & {
	name: string,
	/** Whether the users in this field must be unique. */
	unique?: boolean
};

const UserArrayField = ({
	name,
	required,
	readOnly,
	className,
	...props
}: UserArrayFieldProps) => {
	const userArrayFieldRef = useRef<HTMLDivElement>(null as never);

	const [, { value: fieldValue }, { setValue: setFieldValue }] = useField<Array<string | undefined>>(name);

	const { current: userFieldKeys } = useRef<integer[]>([]);

	const getUserFieldKey = (index: integer) => {
		if (index >= userFieldKeys.length) {
			let i;
			for (i = 0; userFieldKeys.includes(i); i++) {}
			userFieldKeys[index] = i;
		}

		return userFieldKeys[index];
	};

	const value = useMemo(() => (
		fieldValue as typeof fieldValue | undefined
		|| []
	), [fieldValue]);

	return (
		<div
			className={classes('user-array-field', className)}
			ref={userArrayFieldRef}
		>
			{value.map((userID, i) => (
				<UserField
					key={getUserFieldKey(i)}
					name={`${name}.${i}`}
					required={required && value.length === 1}
					readOnly={readOnly}
					inUserArrayField
					userArrayFieldKeys={userFieldKeys}
					userArrayFieldValue={value}
					{...props}
				/>
			))}
			{!readOnly && (
				<AddUserButton
					value={value}
					setValue={setFieldValue}
					userArrayFieldRef={userArrayFieldRef}
				/>
			)}
		</div>
	);
};

export default UserArrayField;
