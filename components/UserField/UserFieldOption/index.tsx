import './styles.module.scss';
import useFunction from 'modules/client/useFunction';
import type { PublicUser } from 'modules/client/users';
import IconImage from 'components/IconImage';

export type UserFieldOptionProps = {
	publicUser: PublicUser,
	setValue: (newValue: string | undefined) => void,
	disabled?: boolean
};

const UserFieldOption = ({ publicUser, setValue, disabled }: UserFieldOptionProps) => (
	<button
		type="button"
		className="user-field-option"
		disabled={disabled}
		onClick={
			useFunction(() => {
				setValue(publicUser.id);
			})
		}
	>
		<IconImage
			src={publicUser.icon}
			alt={`${publicUser.name}'s Icon`}
		/>
		<div className="user-field-option-label">
			<span className="user-field-option-name">{publicUser.name}</span><br />
			<span className="user-field-option-id">{publicUser.id}</span>
		</div>
	</button>
);

export default UserFieldOption;