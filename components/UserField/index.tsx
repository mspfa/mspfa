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
import axios from 'axios';

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
		mounted: false,
		cancelTokenSource: undefined as ReturnType<typeof axios.CancelToken.source> | undefined
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
			autoComplete.cancelTokenSource?.cancel();
			autoComplete.cancelTokenSource = axios.CancelToken.source();

			const { data: newAutoCompleteUsers } = await (api as UsersAPI).get('/users', {
				params: {
					search
				},
				cancelToken: autoComplete.cancelTokenSource.token
			});

			autoComplete.cancelTokenSource = undefined;

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
		}, 0);

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
			// The user started editing.

			// We only want to select the input field if there is anything to select. If there isn't, that means this component mounted without a value, and the user didn't activate the edit button.
			if (inputValue) {
				(userFieldRef.current!.getElementsByClassName('user-field-input')[0] as HTMLInputElement).select();
			}
		} else {
			// The user stopped editing.

			if (autoComplete.timeout) {
				clearTimeout(autoComplete.timeout);
				autoComplete.timeout = undefined;
			}

			if (autoComplete.cancelTokenSource) {
				autoComplete.cancelTokenSource.cancel();
				autoComplete.cancelTokenSource = undefined;
			}

			// Reset the auto-complete users so starting editing does not display an outdated auto-complete list for an instant.
			setAutoCompleteUsers([]);
		}

		// This ESLint comment is necessary because the rule incorrectly thinks `autoComplete` can change.
		// eslint-disable-next-line react-hooks/exhaustive-deps
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