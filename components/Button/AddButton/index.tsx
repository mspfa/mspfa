import './styles.module.scss';
import type { ButtonProps } from 'components/Button';
import Button from 'components/Button';

export type AddButtonProps = Omit<ButtonProps, 'children'>;

const AddButton = ({ className, ...props }: AddButtonProps) => (
	<Button
		className={`icon add${className ? ` ${className}` : ''}`}
		title="Add"
		{...props}
	/>
);

export default AddButton;