import './styles.module.scss';
import { useField } from 'formik';
import type { InputHTMLAttributes } from 'react';
import { useCallback, useMemo } from 'react';
import UserField from 'components/UserField';
import AddUserButton from 'components/UserField/AddUserButton';

export type UserArrayFieldItemProps = {
	name: string,
	index: number,
	value: Array<string | undefined>,
	setValue: (value: Array<string | undefined>) => void
};

const UserArrayFieldItem = ({ name, index, value, setValue }: UserArrayFieldItemProps) => (
	<UserField
		name={`${name}.${index}`}
		onChange={
			useCallback(({ target }: { target: HTMLInputElement }) => {
				setValue([
					...value.slice(0, index),
					target.value,
					...value.slice(index + 1, value.length)
				]);
			}, [index, value, setValue])
		}
		formikField
	/>
);

export type UserArrayFieldProps = Pick<InputHTMLAttributes<HTMLInputElement>, 'required' | 'readOnly' | 'autoFocus' | 'className'> & {
	name: string,
	/** The initial value of the user field. If undefined, defaults to any initial value set by Formik. */
	initialValue?: Array<string | undefined>,
	/** Whether the value of the user field should be controlled by Formik. */
	formikField?: boolean
};

const UserArrayField = ({
	name,
	formikField,
	initialValue: initialValueProp,
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

	console.log(value);

	return (
		<div
			className={`user-array-field${className ? ` ${className}` : ''}`}
		>
			{value.map((userID, index) => (
				<UserArrayFieldItem
					key={index}
					name={name}
					index={index}
					value={value}
					setValue={setValue}
				/>
			))}
			{value[value.length - 1] !== undefined && (
				<AddUserButton value={value} setValue={setValue} />
			)}
		</div>
	);
};

export default UserArrayField;