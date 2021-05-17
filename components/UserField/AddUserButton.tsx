import AddButton from 'components/Button/AddButton';
import { useCallback } from 'react';

export type AddUserButtonProps = {
	value: Array<string | undefined>,
	setValue: (value: Array<string | undefined>) => void
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