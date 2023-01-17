import './styles.module.scss';
import type { ButtonProps } from 'components/Button';
import Button from 'components/Button';
import classes from 'lib/client/classes';

export type SaveButtonProps = Omit<ButtonProps, 'children'>;

const SaveButton = ({ className, ...props }: SaveButtonProps) => (
	<Button
		icon
		className={classes('save-button', className)}
		title="Save"
		{...props}
	/>
);

export default SaveButton;
