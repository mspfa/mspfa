import './styles.module.scss';
import type { ButtonProps } from 'components/Button';
import Button from 'components/Button';

export type EditButtonProps = Omit<ButtonProps, 'children'>;

const EditButton = ({ className, ...props }: EditButtonProps) => (
	<Button
		icon
		className={`edit-button${className ? ` ${className}` : ''}`}
		title="Edit"
		{...props}
	/>
);

export default EditButton;