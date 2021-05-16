import './styles.module.scss';
import type { Dispatch, SetStateAction } from 'react';
import { useCallback } from 'react';
import type { PublicUser } from 'modules/client/users';
import IconImage from 'components/IconImage';
import type { UserFieldProps } from 'components/UserField';

export type UserFieldOptionProps = {
	publicUser: PublicUser,
	setValue: Dispatch<SetStateAction<PublicUser | undefined>>,
	setFieldValue?: (value: PublicUser | undefined) => void,
	onChange?: UserFieldProps['onChange']
};

const UserFieldOption = ({ publicUser, setValue, setFieldValue, onChange }: UserFieldOptionProps) => (
	<button
		type="button"
		className="user-field-option"
		onClick={
			useCallback(() => {
				setValue(publicUser);
				setFieldValue?.(publicUser);
				onChange?.({ value: publicUser });
			}, [publicUser, setValue, setFieldValue, onChange])
		}
	>
		<IconImage src={publicUser.icon} />
		<div className="user-field-option-label">
			<span className="user-field-option-name">{publicUser.name}</span><br />
			<span className="user-field-option-id">{publicUser.id}</span>
		</div>
	</button>
);

export default UserFieldOption;