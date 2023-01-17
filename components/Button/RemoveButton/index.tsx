import './styles.module.scss';
import type { ButtonProps } from 'components/Button';
import Button from 'components/Button';
import classes from 'lib/client/classes';

export type RemoveButtonProps = Omit<ButtonProps, 'children'>;

const RemoveButton = ({ className, ...props }: RemoveButtonProps) => (
	<Button
		icon
		className={classes('remove-button', className)}
		title="Remove"
		{...props}
	/>
);

export default RemoveButton;
