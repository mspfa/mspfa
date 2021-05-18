import './styles.module.scss';
import { useField } from 'formik';
import { InputHTMLAttributes, useCallback } from 'react';
import { useMemo } from 'react';
import UserField from 'components/UserField';
import AddUserButton from 'components/UserField/AddUserButton';

export type UserArrayFieldProps = Pick<InputHTMLAttributes<HTMLInputElement>, 'required' | 'readOnly' | 'autoFocus' | 'className'> & {
	name: string
};

const UserArrayField = ({
	name,
	required,
	readOnly,
	className,
	...props
}: UserArrayFieldProps) => {
	const [, { value: fieldValue }, { setValue }] = useField<Array<string | undefined>>(name);

	const value = useMemo(() => (
		fieldValue as typeof fieldValue | undefined
		|| []
	), [fieldValue]);

	return (
		<div
			className={`user-array-field${className ? ` ${className}` : ''}`}
		>
			{value.map((userID, index) => (
				<UserField
					key={index}
					name={`${name}.${index}`}
					required={required && value.length === 1}
					readOnly={readOnly}
					formikField
					deletable={!(required && value.length === 1)}
					{...props}
				/>
			))}
			{!readOnly && (
				<AddUserButton value={value} setValue={setValue} />
			)}
		</div>
	);
};

export default UserArrayField;