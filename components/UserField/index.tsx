import './styles.module.scss';
import { useField } from 'formik';
import { toKebabCase } from 'modules/client/utilities';
import type { ChangeEvent, InputHTMLAttributes } from 'react';
import { useCallback, useState, useRef } from 'react';
import { usePrefixedID } from 'modules/client/IDPrefix';
import api from 'modules/client/api';
import type { APIClient } from 'modules/client/api';
import type { PublicUser } from 'modules/client/users';
import IconImage from 'components/IconImage';

type UsersAPI = APIClient<typeof import('pages/api/users').default>;

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

	// This state is whether the user field should have the `open-auto-complete` class, which causes its auto-complete menu to be visible.
	const [openAutoComplete, setOpenAutoComplete] = useState(false);
	const userFieldRef = useRef<HTMLSpanElement>(null!);
	const [autoCompleteUsers, setAutoCompleteUsers] = useState<PublicUser[]>([]);
	const [autoComplete] = useState({
		timeout: undefined as NodeJS.Timeout | undefined,
		update: undefined as unknown as (() => Promise<void>)
	});

	autoComplete.update = async () => {
		if (inputValue) {
			const { data: newAutoCompleteUsers } = await (api as UsersAPI).get('/users', {
				params: {
					search: inputValue
				}
			});

			setAutoCompleteUsers(newAutoCompleteUsers);
		} else {
			setAutoCompleteUsers([]);
		}
	};

	const onChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
		setInputValue(event.target.value);

		// Only `autoComplete.update` at most once per 500 ms.

		if (autoComplete.timeout) {
			clearTimeout(autoComplete.timeout);
		}

		autoComplete.timeout = setTimeout(() => {
			autoComplete.timeout = undefined;

			autoComplete.update();
		}, 500);

		// This ESLint comment is necessary because the rule thinks `autoComplete` can change.
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

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
				placeholder="Enter Username or ID"
				autoComplete="off"
				maxLength={32}
				size={20}
				value={inputValue}
				onChange={onChange}
				{...props}
			/>
			{!!autoCompleteUsers.length && (
				<div className="user-field-auto-complete input-like">
					{autoCompleteUsers.map(publicUser => (
						<button
							key={publicUser.id}
							type="button"
							className="user-field-option"
						>
							<IconImage src={publicUser.icon} />
							<div className="user-field-option-label">
								<span className="user-field-option-name">{publicUser.name}</span><br />
								<span className="user-field-option-id">{publicUser.id}</span>
							</div>
						</button>
					))}
				</div>
			)}
		</span>
	);
};

export default UserField;