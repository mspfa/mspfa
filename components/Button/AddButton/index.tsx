import './styles.module.scss';
import type { ButtonProps } from 'components/Button';
import Button from 'components/Button';

export type AddButtonProps = Omit<ButtonProps, 'children'>;

const AddButton = ({ className, ...props }: AddButtonProps) => (
	<Button
		icon
		className={`add-button${className ? ` ${className}` : ''}`}
		title="Add"
		{...props}
	/>
);

export default AddButton;