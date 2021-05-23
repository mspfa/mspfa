import './styles.module.scss';
import { useField } from 'formik';
import type { InputHTMLAttributes } from 'react';
import { useState, useMemo, useRef } from 'react';
import UserField from 'components/UserField';
import AddUserButton from 'components/UserField/AddUserButton';

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
	const userArrayFieldRef = useRef<HTMLDivElement>(null!);

	const [, { value: fieldValue }, { setValue }] = useField<Array<string | undefined>>(name);
	const [userFieldKeys] = useState<number[]>([]);

	const getUserFieldKey = (index: number) => {
		if (index >= userFieldKeys.length) {
			let i = 0;
			for (; userFieldKeys.includes(i); i++) {}
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
			className={`user-array-field${className ? ` ${className}` : ''}`}
			ref={userArrayFieldRef}
		>
			{value.map((userID, index) => (
				<UserField
					key={getUserFieldKey(index)}
					name={`${name}.${index}`}
					required={required && value.length === 1}
					readOnly={readOnly}
					formikField
					deletable={!(required && value.length === 1)}
					userFieldKeys={userFieldKeys}
					userFieldArrayValue={value}
					{...props}
				/>
			))}
			{!readOnly && (
				<AddUserButton
					value={value}
					setValue={setValue}
					userArrayFieldRef={userArrayFieldRef}
				/>
			)}
		</div>
	);
};

export default UserArrayField;