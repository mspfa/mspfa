import './styles.module.scss';
import { useField } from 'formik';
import { toKebabCase } from 'modules/client/utilities';
import type { ChangeEvent, InputHTMLAttributes } from 'react';
import { useCallback, useState, useRef, useEffect } from 'react';
import { usePrefixedID } from 'modules/client/IDPrefix';
import api from 'modules/client/api';
import type { APIClient } from 'modules/client/api';
import type { PublicUser } from 'modules/client/users';
import UserFieldOption from './UserFieldOption';
import Link from 'components/Link';
import EditButton from 'components/Button/EditButton';

type UsersAPI = APIClient<typeof import('pages/api/users').default>;

export type UserFieldProps = Pick<InputHTMLAttributes<HTMLInputElement>, 'id' | 'required' | 'autoFocus' | 'onChange'> & {
	name: string,
	/**
	 * The controlled value of the user field.
	 *
	 * If this is undefined, the value will be controlled internally.
	 */
	value?: PublicUser,
	/** Whether the value of the user field should be controlled by Formik. */
	formikField?: boolean
};

const UserField = ({
	name,
	id,
	formikField,
	value: propValue,
	required,
	...props
}: UserFieldProps) => {
	const idPrefix = usePrefixedID();

	if (id === undefined) {
		id = `${idPrefix}field-${toKebabCase(name)}`;
	}

	const [, , { setValue: setFieldValue }] = useField<string | undefined>(name);
	const [value, setValue] = useState<PublicUser | undefined>(propValue);
	const [inputValue, setInputValue] = useState('');

	// This state is whether the user field should have the `open-auto-complete` class, which causes its auto-complete menu to be visible.
	const [openAutoComplete, setOpenAutoComplete] = useState(false);
	const userFieldRef = useRef<HTMLSpanElement>(null);
	const [autoCompleteUsers, setAutoCompleteUsers] = useState<PublicUser[]>([]);
	const [autoComplete] = useState({
		timeout: undefined as NodeJS.Timeout | undefined,
		update: undefined as unknown as ((overrideSearch?: string) => Promise<void>),
		mounted: false
	});

	useEffect(() => {
		autoComplete.mounted = true;

		return () => {
			autoComplete.mounted = false;
		};

		// This ESLint comment is necessary because the rule incorrectly thinks `autoComplete` can change.
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	autoComplete.update = async (search: string = inputValue) => {
		if (search) {
			const { data: newAutoCompleteUsers } = await (api as UsersAPI).get('/users', {
				params: {
					search
				}
			});

			if (autoComplete.mounted) {
				setAutoCompleteUsers(newAutoCompleteUsers);
			}
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

		// This ESLint comment is necessary because the rule incorrectly thinks `autoComplete` can change.
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	const onFocus = useCallback(() => {
		setOpenAutoComplete(true);
	}, []);

	const onBlur = useCallback(() => {
		// `setTimeout` is necessary here because otherwise, for example when tabbing through auto-complete options, this will run before the next auto-complete option focuses, so the `if` statement would not detect that any option is in focus.
		setTimeout(() => {
			if (!userFieldRef.current!.contains(document.activeElement)) {
				setOpenAutoComplete(false);
			}
		});
	}, []);

	const editValue = useCallback(() => {
		setInputValue(value!.name);
		setValue(undefined);
		autoComplete.update(value!.name);

		// This ESLint comment is necessary because the rule incorrectly thinks `autoComplete` can change.
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [value]);

	const isEditing = !value;

	useEffect(() => {
		if (isEditing) {
			(userFieldRef.current!.getElementsByClassName('user-field-input')[0] as HTMLInputElement).select();
		}
	}, [isEditing]);

	return value ? (
		<span
			className="user-field"
		>
			<Link
				className="spaced"
				href={`/u/${value.id}`}
			>
				{value.name}
			</Link>
			<EditButton
				className="spaced"
				onClick={editValue}
			/>
		</span>
	) : (
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
						<UserFieldOption
							key={publicUser.id}
							publicUser={publicUser}
							setValue={setValue}
							setFieldValue={formikField ? setFieldValue : undefined}
						/>
					))}
				</div>
			)}
		</span>
	);
};

export default UserField;