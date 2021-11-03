import './styles.module.scss';
import type { ButtonProps } from 'components/Button';
import Button from 'components/Button';

export type SaveButtonProps = Omit<ButtonProps, 'children'>;

const SaveButton = ({ className, ...props }: SaveButtonProps) => (
	<Button
		icon
		className={`save-button${className ? ` ${className}` : ''}`}
		title="Save"
		{...props}
	/>
);

export default SaveButton;