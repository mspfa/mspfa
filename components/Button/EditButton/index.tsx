import './styles.module.scss';
import type { ButtonProps } from 'components/Button';
import Button from 'components/Button';
import classes from 'lib/client/classes';

export type EditButtonProps = Omit<ButtonProps, 'children'>;

const EditButton = ({ className, ...props }: EditButtonProps) => (
	<Button
		icon
		className={classes('edit-button', className)}
		title="Edit"
		{...props}
	/>
);

export default EditButton;
