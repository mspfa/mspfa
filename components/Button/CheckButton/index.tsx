import './styles.module.scss';
import type { ButtonProps } from 'components/Button';
import Button from 'components/Button';
import classes from 'lib/client/classes';

export type CheckButtonProps = Omit<ButtonProps, 'children'>;

const CheckButton = ({ className, ...props }: CheckButtonProps) => (
	<Button
		icon
		className={classes('check-button', className)}
		title="Done"
		{...props}
	/>
);

export default CheckButton;
