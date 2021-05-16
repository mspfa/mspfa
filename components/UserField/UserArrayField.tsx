import './styles.module.scss';
import { useField } from 'formik';
import type { InputHTMLAttributes } from 'react';
import { useCallback, useMemo } from 'react';
import type { PublicUser } from 'modules/client/users';
import UserField from 'components/UserField';
import AddUserButton from 'components/UserField/AddUserButton';

export type UserArrayFieldItemProps = {
	name: string,
	index: number,
	value: Array<PublicUser | undefined>,
	setValue: (value: Array<PublicUser | undefined>) => void
};

const UserArrayFieldItem = ({ name, index, value, setValue }: UserArrayFieldItemProps) => (
	<UserField
		name={`${name}.${index}`}
		onChange={
			useCallback(({ value: newPublicUser }: { value: PublicUser | undefined }) => {
				setValue([
					...value.slice(0, index),
					newPublicUser,
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
	initialValue?: Array<PublicUser | undefined>,
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
	const [, { value: fieldValue }, { setValue }] = useField<Array<PublicUser | undefined>>(name);

	const value = useMemo(() => (
		fieldValue as typeof fieldValue | undefined
		|| []
	), [fieldValue]);

	console.log(value);

	return (
		<div
			className={`user-array-field${className ? ` ${className}` : ''}`}
		>
			{value.map((publicUser, index) => (
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