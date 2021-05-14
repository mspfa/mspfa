import './styles.module.scss';
import { useField } from 'formik';
import { toKebabCase } from 'modules/client/utilities';
import type { ChangeEvent, InputHTMLAttributes } from 'react';
import { useCallback, useState, useRef } from 'react';
import { usePrefixedID } from 'modules/client/IDPrefix';

// @client-only {
const nativeInput = document.createElement('input');
// @client-only }

export type UserFieldProps = Pick<InputHTMLAttributes<HTMLInputElement>, 'id' | 'required' | 'autoFocus' | 'onChange'> & {
	name: string,
	/**
	 * The controlled value of the user field.
	 *
	 * If this is undefined, the value will be controlled internally.
	 */
	value?: string,
	/** Whether the value of the user field should be controlled by Formik. */
	formikField?: boolean
};

const UserField = ({
	name,
	id,
	formikField,
	value: propValue,
	onChange: onChangeProp,
	required,
	...props
}: UserFieldProps) => {
	const idPrefix = usePrefixedID();

	if (id === undefined) {
		id = `${idPrefix}field-${toKebabCase(name)}`;
	}

	const [, { value: fieldValue }, { setValue: setFieldValue }] = useField<string | undefined>(name);
	const [inputValue, setInputValue] = useState('');
	const [autoComplete] = useState({
		timeout: undefined as NodeJS.Timeout | undefined
	});

	// This state is whether the user field should have the `open-auto-complete` class, which causes its auto-complete menu to be visible.
	const [openAutoComplete, setOpenAutoComplete] = useState(false);
	const userFieldRef = useRef<HTMLSpanElement>(null!);

	const updateAutoComplete = useCallback(() => {

	}, []);

	const onChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
		setInputValue(event.target.value);

		// Only `updateAutoComplete` at most once per 500 ms.

		if (autoComplete.timeout) {
			clearTimeout(autoComplete.timeout);
		}

		autoComplete.timeout = setTimeout(() => {
			autoComplete.timeout = undefined;

			updateAutoComplete();
		}, 500);

		// This ESLint comment is necessary because the rule thinks `autoComplete` can change.
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [updateAutoComplete]);

	const onFocus = useCallback(() => {
		setOpenAutoComplete(true);
	}, []);

	const onBlur = useCallback(() => {
		// `setTimeout` is necessary here because otherwise, for example when tabbing through auto-complete options, this will run before the next auto-complete option focuses, so the `if` statement would not detect that any option is in focus.
		setTimeout(() => {
			if (!userFieldRef.current.contains(document.activeElement)) {
				setOpenAutoComplete(false);
			}
		});
	}, []);

	return (
		<span
			className={`user-field${openAutoComplete ? ' open-auto-complete' : ''}`}
			onFocus={onFocus}
			onBlur={onBlur}
			ref={userFieldRef}
		>
			<input
				id={id}
				className="user-field-input"
				placeholder="Enter a Username"
				value={inputValue}
				onChange={onChange}
				autoComplete="off"
				{...props}
			/>
			<div className="user-field-auto-complete input-like">
				<button type="button" className="user-field-option">person 1</button>
				<button type="button" className="user-field-option">other person</button>
				<button type="button" className="user-field-option">person with long username</button>
			</div>
		</span>
	);
};

export default UserField;