import './styles.module.scss';
import { useFormikContext } from 'formik';
import { toKebabCase } from 'modules/client/utilities';
import type { ChangeEvent, InputHTMLAttributes } from 'react';
import { useCallback, useState, useRef, useEffect } from 'react';
import { usePrefixedID } from 'modules/client/IDPrefix';
import api from 'modules/client/api';
import type { APIClient } from 'modules/client/api';
import type { PublicUser } from 'modules/client/users';
import UserFieldOption from 'components/UserField/UserFieldOption';
import Link from 'components/Link';
import EditButton from 'components/Button/EditButton';
import axios from 'axios';
import { useUserCache } from 'modules/client/UserCache';
import RemoveButton from 'components/Button/RemoveButton';

type UsersAPI = APIClient<typeof import('pages/api/users').default>;

const nativeInput = document.createElement('input'); // @client-only

export type UserFieldProps = Pick<InputHTMLAttributes<HTMLInputElement>, 'id' | 'required' | 'readOnly' | 'autoFocus'> & {
	name: string,
	/** The initial value of the user field. If undefined, defaults to any initial value set by Formik. */
	initialValue?: string,
	/** Whether the value of the user field should be controlled by Formik. */
	formikField?: boolean,
	/** Whether to show an option to remove this user field from a parent user array field. */
	deletable?: boolean,
	/**
	 * The React keys of the user field array's children which include this component.
	 *
	 * Only used if `deletable` is `true`.
	 */
	userFieldKeys?: number[],
	/** Whether the value of this field must be unique from other user fields in the parent user field array. */
	unique?: boolean,
	/** The value of the parent `UserFieldArray`. */
	userFieldArrayValue?: Array<string | undefined>,
	onChange?: (event: {
		target: HTMLInputElement
	}) => void
};

const UserField = ({
	name,
	id,
	formikField,
	initialValue: initialValueProp,
	required,
	readOnly,
	deletable,
	userFieldKeys,
	unique,
	userFieldArrayValue,
	onChange: onChangeProp,
	autoFocus
}: UserFieldProps) => {
	const idPrefix = usePrefixedID();

	if (id === undefined) {
		id = `${idPrefix}field-${toKebabCase(name)}`;
	}

	const { userCache, cacheUser, getCachedUser } = useUserCache();

	const { getFieldMeta, setFieldValue } = useFormikContext();
	const fieldValue = getFieldMeta<string | undefined>(name).value;
	const [valueState, setValueState] = useState(initialValueProp || fieldValue);
	const value = fieldValue || valueState;

	const [inputValue, setInputValue] = useState('');

	// This state is whether the user field should have the `open-auto-complete` class, which causes its auto-complete menu to be visible.
	const [openAutoComplete, setOpenAutoComplete] = useState(false);
	const userFieldRef = useRef<HTMLDivElement>(null);
	const [autoCompleteUsers, setAutoCompleteUsers] = useState<PublicUser[]>([]);

	/** ⚠️ Do not call `updateAutoComplete` directly. Call `autoComplete.update` instead, as it is always kept updated with the value from the latest render. */
	const updateAutoComplete = async (search: string = inputValue) => {
		if (search) {
			// Cancel any previous request.
			autoComplete.cancelTokenSource?.cancel();
			// Allow the next request to be cancelled.
			autoComplete.cancelTokenSource = axios.CancelToken.source();

			const { data: newAutoCompleteUsers } = await (api as UsersAPI).get('/users', {
				params: {
					search
				},
				cancelToken: autoComplete.cancelTokenSource.token
			});

			// Now that the request is complete, do not allow it to be cancelled.
			autoComplete.cancelTokenSource = undefined;

			newAutoCompleteUsers.forEach(cacheUser);

			if (autoComplete.mounted) {
				setAutoCompleteUsers(newAutoCompleteUsers);
			}
		} else {
			setAutoCompleteUsers([]);
		}
	};

	const [autoComplete] = useState({
		timeout: undefined as NodeJS.Timeout | undefined,
		update: updateAutoComplete,
		mounted: false,
		cancelTokenSource: undefined as ReturnType<typeof axios.CancelToken.source> | undefined
	});

	autoComplete.update = updateAutoComplete;

	useEffect(() => {
		autoComplete.mounted = true;

		return () => {
			autoComplete.mounted = false;
		};

		// This ESLint comment is necessary because the rule incorrectly thinks `autoComplete` can change.
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

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

	const changeValue = useCallback(async (newValue: string | undefined) => {
		setValueState(newValue);

		if (formikField) {
			setFieldValue(name, newValue || '');
		}

		nativeInput.name = name;
		nativeInput.value = newValue || '';

		onChangeProp?.({ target: nativeInput });
	}, [name, formikField, setFieldValue, onChangeProp]);

	const startEditing = useCallback(async () => {
		// We can assert `value!` because `value` must already be set for the edit button to be visible.
		const newInputValue = inputValue || (await getCachedUser(value!)).name;

		// If the value has never been edited before (and is therefore empty), auto-fill the user search input with the username from before editing started. But if it has been edited before, then leave it be what it was when it was last edited.
		if (!inputValue) {
			setInputValue(newInputValue);
		}

		autoComplete.update(newInputValue);

		changeValue(undefined);

		// This ESLint comment is necessary because the rule incorrectly thinks `autoComplete` can change.
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [value, changeValue, getCachedUser, inputValue]);

	const isEditing = !value;

	const onFocus = useCallback(() => {
		if (isEditing) {
			setOpenAutoComplete(true);
		}
	}, [isEditing]);

	const onBlur = useCallback(() => {
		if (isEditing) {
			// `setTimeout` is necessary here because otherwise, for example when tabbing through auto-complete options, this will run before the next auto-complete option focuses, so the `if` statement would not detect that any option is in focus.
			setTimeout(() => {
				if (!(
					// An element is focused,
					document.activeElement
					// the user field is mounted,
					&& userFieldRef.current
					// the focused element is in the user field,
					&& userFieldRef.current.contains(document.activeElement)
					// and the focused element is the user field input or an auto-complete option.
					&& /(?:^| )user-field-(?:input|option)(?: |$)/.test(document.activeElement.className)
				)) {
					setOpenAutoComplete(false);
				}
			});
		}
	}, [isEditing]);

	useEffect(() => {
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

		// This ESLint comment is necessary because the purpose of this effect hook is to do things after mount when the user initially starts or stops editing, so `isEditing` is the only value I want to listen to changes in. Do not add anything to this hook which does not fit that purpose.
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [isEditing]);

	useEffect(() => {
		if (isEditing) {
			// The component rendered while the user is editing.

			const userFieldInput = userFieldRef.current!.getElementsByClassName('user-field-input')[0] as HTMLInputElement;

			// This type assertion is necessary because this method may not exist on all browsers.
			(userFieldInput.setCustomValidity as typeof userFieldInput.setCustomValidity | undefined)?.(
				required ? 'Please enter a username or ID and select a user.' : ''
			);
		}
	}, [isEditing, required]);

	const deleteFromArray = useCallback(() => {
		const [, arrayFieldName, indexString] = name.match(/(.+)\.(\d+)/)!;
		const index = +indexString;
		const arrayFieldValue = getFieldMeta<string[]>(arrayFieldName).value;

		userFieldKeys?.splice(index, 1);

		setFieldValue(arrayFieldName, [
			...arrayFieldValue.slice(0, index),
			...arrayFieldValue.slice(index + 1, arrayFieldValue.length)
		]);
	}, [name, getFieldMeta, setFieldValue, userFieldKeys]);

	return (
		<div
			className={`user-field${isEditing && openAutoComplete ? ' open-auto-complete' : ''}`}
			onFocus={onFocus}
			onBlur={onBlur}
			ref={userFieldRef}
		>
			{value ? (
				<>
					<Link href={`/u/${value}`}>
						{/* Non-nullability of the cached user can be asserted here because there are two possible cases: */}
						{/* In the case that the value was set by the user selecting an auto-complete option, the value will already be cached because fetching auto-complete entries caches the users in those entries. */}
						{/* In the case that the value was passed in from outside rather than by the user selecting an auto-complete option, the outside source of this user ID should cache the user it represents. If it does not, it should be changed to, or else this will throw an error. */}
						{userCache[value]!.name}
					</Link>
					{!readOnly && (
						<EditButton onClick={startEditing} />
					)}
				</>
			) : (
				<>
					<input
						id={id}
						className="user-field-input"
						placeholder="Enter Username or ID"
						autoComplete="off"
						maxLength={32}
						size={20}
						required={required}
						// If `required === true`, the below `pattern` will never allow the input to be valid due to the above `required` prop, invalidating the form for browsers that don't support `setCustomValidity`.
						pattern={required ? '^$' : undefined}
						readOnly={readOnly}
						autoFocus={autoFocus}
						value={inputValue}
						onChange={onChange}
					/>
					{!!autoCompleteUsers.length && (
						<div className="user-field-auto-complete input-like">
							{autoCompleteUsers.map(publicUser => (
								<UserFieldOption
									key={publicUser.id}
									publicUser={publicUser}
									setValue={changeValue}
									disabled={unique && userFieldArrayValue?.includes(publicUser.id)}
								/>
							))}
						</div>
					)}
				</>
			)}
			{deletable && (
				<RemoveButton onClick={deleteFromArray} />
			)}
		</div>
	);
};

export default UserField;