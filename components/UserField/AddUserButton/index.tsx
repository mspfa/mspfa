import AddButton from 'components/Button/AddButton';
import type { MutableRefObject } from 'react';
import useFunction from 'lib/client/reactHooks/useFunction';

export type AddUserButtonProps = {
	value: Array<string | undefined>,
	setValue: (value: Array<string | undefined>) => void,
	userArrayFieldRef: MutableRefObject<HTMLDivElement>
};

const AddUserButton = ({ value, setValue, userArrayFieldRef }: AddUserButtonProps) => (
	<AddButton
		title="Add User"
		onClick={
			useFunction(() => {
				setValue([...value, undefined]);

				// This timeout is necessary to wait for the newly added user field to render.
				setTimeout(() => {
					const userFieldInputs = userArrayFieldRef.current.getElementsByClassName('user-field-input') as HTMLCollectionOf<HTMLInputElement>;

					// Check if there is any user field input to focus, just in case it was somehow removed during the timeout.
					if (userFieldInputs.length) {
						// Focus the newly added user field's input.
						userFieldInputs[userFieldInputs.length - 1].focus();
					}
				});
			})
		}
	/>
);

export default AddUserButton;