import './styles.module.scss';
import type { ButtonProps } from 'components/Button';
import Button from 'components/Button';
import classes from 'lib/client/classes';

export type OptionsButtonProps = Omit<ButtonProps, 'children'>;

const OptionsButton = ({ className, ...props }: OptionsButtonProps) => (
	<Button
		icon
		className={classes('options-button', className)}
		title="Options"
		{...props}
	/>
);

export default OptionsButton;
