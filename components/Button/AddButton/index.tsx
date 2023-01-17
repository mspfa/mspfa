import './styles.module.scss';
import type { ButtonProps } from 'components/Button';
import Button from 'components/Button';
import classes from 'lib/client/classes';

export type AddButtonProps = Omit<ButtonProps, 'children'>;

const AddButton = ({ className, ...props }: AddButtonProps) => (
	<Button
		icon
		className={classes('add-button', className)}
		title="Add"
		{...props}
	/>
);

export default AddButton;
