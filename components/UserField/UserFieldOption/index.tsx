import './styles.module.scss';
import type { Dispatch, SetStateAction } from 'react';
import { useCallback } from 'react';
import type { PublicUser } from 'modules/client/users';
import IconImage from 'components/IconImage';

export type UserFieldOptionProps = {
	publicUser: PublicUser,
	setValue: Dispatch<SetStateAction<PublicUser | undefined>>,
	setFieldValue?: (value: PublicUser | undefined) => void
};

const UserFieldOption = ({ publicUser, setValue, setFieldValue }: UserFieldOptionProps) => (
	<button
		type="button"
		className="user-field-option"
		onClick={
			useCallback(() => {
				setValue(publicUser);
				setFieldValue?.(publicUser);
			}, [publicUser, setValue, setFieldValue])
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