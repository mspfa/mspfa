import AddButton from 'components/Button/AddButton';
import type { PublicUser } from 'modules/client/users';
import { useCallback } from 'react';

export type AddUserButtonProps = {
	value: Array<PublicUser | undefined>,
	setValue: (value: Array<PublicUser | undefined>) => void
};

const AddUserButton = ({ value, setValue }: AddUserButtonProps) => (
	<AddButton
		onClick={
			useCallback(() => {
				setValue([...value, undefined]);
			}, [value, setValue])
		}
	/>
);

export default AddUserButton;