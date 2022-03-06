import './styles.module.scss';
import { useFormikContext } from 'formik';
import toKebabCase from 'lib/client/toKebabCase';
import type { ChangeEvent, InputHTMLAttributes, ReactNode } from 'react';
import { useState, useRef, useEffect } from 'react';
import useFunction from 'lib/client/reactHooks/useFunction';
import { usePrefixedID } from 'lib/client/reactContexts/IDPrefix';
import api from 'lib/client/api';
import type { APIClient } from 'lib/client/api';
import type { PublicUser } from 'lib/client/users';
import UserFieldOption from 'components/UserField/UserFieldOption';
import EditButton from 'components/Button/EditButton';
import type { CancelTokenSource } from 'axios';
import axios from 'axios';
import { useUserCache } from 'lib/client/reactContexts/UserCache';
import RemoveButton from 'components/Button/RemoveButton';
import useIsomorphicLayoutEffect from 'lib/client/reactHooks/useIsomorphicLayoutEffect';
import useLatest from 'lib/client/reactHooks/useLatest';
import Dialog from 'lib/client/Dialog';
import useThrottled from 'lib/client/reactHooks/useThrottled';
import useMountedRef from 'lib/client/reactHooks/useMountedRef';
import UserLink from 'components/Link/UserLink';
import type { integer } from 'lib/types';

type UsersAPI = APIClient<typeof import('pages/api/users').default>;

const nativeInput = document.createElement('input'); // @client-only

export type UserFieldProps = Pick<InputHTMLAttributes<HTMLInputElement>, 'id' | 'required' | 'readOnly' | 'autoFocus'> & {
	name: string,
	/** The initial value of the user field. If undefined, defaults to any initial value set by Formik. */
	initialValue?: string,
	/** Whether this field is a child of a `UserArrayField`. */
	inUserArrayField?: boolean,
	/** The React keys of the user array field's children which include this component. */
	userArrayFieldKeys?: integer[],
	/** Whether the value of this field must be unique from other user fields in the parent `UserArrayField`. */
	unique?: boolean,
	/** The value of the parent `UserArrayField`. */
	userArrayFieldValue?: Array<string | undefined>,
	onChange?: (event: {
		target: HTMLInputElement
	}) => void,
	/** The title of the edit button and, if there is one, the edit confirmation dialog. */
	editTitle?: string,
	/** The content of the edit confirmation dialog. */
	confirmEdit?: ReactNode
};

const UserField = ({
	name,
	id,
	initialValue: initialValueProp,
	required,
	readOnly,
	inUserArrayField,
	userArrayFieldKeys,
	unique,
	userArrayFieldValue,
	onChange: onChangeProp,
	autoFocus,
	editTitle = 'Edit',
	confirmEdit
}: UserFieldProps) => {
	const idPrefix = usePrefixedID();

	if (id === undefined) {
		id = `${idPrefix}field-${toKebabCase(name)}`;
	}

	const { userCache, cacheUser } = useUserCache();

	const { getFieldMeta, setFieldValue } = useFormikContext();
	const fieldValue = getFieldMeta<string | undefined>(name).value;
	const [valueState, setValueState] = useState(initialValueProp || fieldValue);
	const value = fieldValue || valueState;

	const [inputValue, setInputValue] = useState('');

	const userFieldRef = useRef<HTMLDivElement>(null);
	const [autoCompleteUsers, setAutoCompleteUsers] = useState<PublicUser[]>([]);

	const mountedRef = useMountedRef();

	const cancelTokenSourceRef = useRef<CancelTokenSource>();

	const updateAutoComplete = useThrottled(async (nameOrID: string) => {
		if (nameOrID) {
			cancelTokenSourceRef.current?.cancel();
			cancelTokenSourceRef.current = axios.CancelToken.source();

			const { data: newAutoCompleteUsers } = await (api as UsersAPI).get('/users', {
				params: {
					limit: 8,
					nameOrID
				},
				cancelToken: cancelTokenSourceRef.current.token
			});

			cancelTokenSourceRef.current = undefined;

			newAutoCompleteUsers.forEach(cacheUser);

			if (mountedRef.current) {
				setAutoCompleteUsers(newAutoCompleteUsers);
			}
		} else {
			setAutoCompleteUsers([]);
		}
	});

	const updateAutoCompleteRef = useLatest(updateAutoComplete);

	const onChange = useFunction((event: ChangeEvent<HTMLInputElement>) => {
		setInputValue(event.target.value);

		updateAutoCompleteRef.current(event.target.value);
	});

	const changeValue = useFunction(async (newValue: string | undefined) => {
		setValueState(newValue);

		setFieldValue(name, newValue || '');

		nativeInput.name = name;
		nativeInput.value = newValue || '';

		onChangeProp?.({ target: nativeInput });
	});

	const startEditing = useFunction(async () => {
		if (confirmEdit && !await Dialog.confirm({
			id: 'user-field-edit',
			title: editTitle,
			content: confirmEdit
		})) {
			return;
		}

		// We can assert `value!` because `value` must already be set for the edit button to be visible.
		const newInputValue = inputValue || userCache[value!]?.name || value!;

		// If the value has never been edited before (and is therefore empty), auto-fill the user search input with the username from before editing started. But if it has been edited before, then leave it be what it was when it was last edited.
		if (!inputValue) {
			setInputValue(newInputValue);
		}

		updateAutoCompleteRef.current(newInputValue);

		changeValue(undefined);
	});

	const isEditing = !value;
	const [wasEditing, setWasEditing] = useState(isEditing);

	useEffect(() => {
		if (isEditing === wasEditing) {
			return;
		}

		// If this point is reached, the user just started or stopped editing.

		if (isEditing) {
			// The user started editing.

			const userFieldInput = userFieldRef.current!.getElementsByClassName('user-field-input')[0] as HTMLInputElement;

			// We only want to select the input field if there is anything to select. If there isn't, that means this component mounted without a value, and the user didn't activate the edit button.
			if (inputValue) {
				userFieldInput.select();
			} else if (autoFocus) {
				// This is necessary because `autoFocus={autoFocus}` on the `input` element only seems to work with SSR.
				userFieldInput.focus();
			}
		} else {
			// The user stopped editing.

			if (updateAutoComplete.timeoutRef.current) {
				clearTimeout(updateAutoComplete.timeoutRef.current);
				updateAutoComplete.timeoutRef.current = undefined;
			}

			if (cancelTokenSourceRef.current) {
				cancelTokenSourceRef.current.cancel();
				cancelTokenSourceRef.current = undefined;
			}

			// Reset the auto-complete users so starting editing does not display an outdated auto-complete list for an instant.
			setAutoCompleteUsers([]);
		}

		setWasEditing(isEditing);
	}, [isEditing, wasEditing, inputValue, autoFocus, updateAutoComplete.timeoutRef]);

	useIsomorphicLayoutEffect(() => {
		if (isEditing) {
			// The component rendered while the user is editing.

			const userFieldInput = userFieldRef.current!.getElementsByClassName('user-field-input')[0] as HTMLInputElement;

			userFieldInput.setCustomValidity(
				// If the field is required, a field still being edited should be invalid to avoid `undefined` being submitted as its value.
				required
				// If the field is part of a `UserArrayField`, a field still being edited should be invalid to avoid `undefined`s in the submitted user array.
				|| inUserArrayField
					? 'Please enter a valid username or ID, and select a user.'
					: ''
			);
		}
	}, [isEditing, required, inUserArrayField]);

	const deleteFromArray = useFunction(() => {
		if (required && userArrayFieldValue!.length === 1) {
			// If the user tries to delete this user from the parent `UserArrayField` while it's `required`, replace it with an empty user field instead.
			setInputValue('');
			changeValue(undefined);

			return;
		}

		const [, arrayFieldName, indexString] = name.match(/(.+)\.(\d+)/)!;
		const index = +indexString;
		const arrayFieldValue = getFieldMeta<string[]>(arrayFieldName).value;

		userArrayFieldKeys?.splice(index, 1);

		setFieldValue(arrayFieldName, [
			...arrayFieldValue.slice(0, index),
			...arrayFieldValue.slice(index + 1, arrayFieldValue.length)
		]);
	});

	return (
		<div
			id={id}
			className="user-field"
			ref={userFieldRef}
		>
			{value ? (
				<UserLink>{value}</UserLink>
			) : (
				<>
					<input
						className="user-field-input"
						placeholder="Enter Username or ID"
						maxLength={32}
						size={20}
						required={required}
						readOnly={readOnly}
						autoFocus={autoFocus}
						value={inputValue}
						onChange={onChange}
					/>
					{autoCompleteUsers.length !== 0 && (
						<div className="user-field-auto-complete input-like">
							{autoCompleteUsers.map(publicUser => (
								<UserFieldOption
									key={publicUser.id}
									publicUser={publicUser}
									setValue={changeValue}
									disabled={unique && userArrayFieldValue?.includes(publicUser.id)}
								/>
							))}
						</div>
					)}
				</>
			)}
			{!readOnly && (
				<span className="user-field-actions">
					{!!value && !inUserArrayField && (
						<EditButton
							className="user-field-action"
							title={editTitle}
							onClick={startEditing}
						/>
					)}
					{inUserArrayField && !(required && isEditing) && (
						<RemoveButton
							className="user-field-action"
							onClick={deleteFromArray}
						/>
					)}
				</span>
			)}
		</div>
	);
};

export default UserField;