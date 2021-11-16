import './styles.module.scss';
import type { ButtonProps } from 'components/Button';
import Button from 'components/Button';

export type CheckButtonProps = Omit<ButtonProps, 'children'>;

const CheckButton = ({ className, ...props }: CheckButtonProps) => (
	<Button
		icon
		className={`check-button${className ? ` ${className}` : ''}`}
		title="Done"
		{...props}
	/>
);

export default CheckButton;