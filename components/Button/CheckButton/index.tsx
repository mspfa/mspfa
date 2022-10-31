import './styles.module.scss';
import type { ButtonProps } from 'components/Button';
import Button from 'components/Button';
import classNames from 'classnames';

export type CheckButtonProps = Omit<ButtonProps, 'children'>;

const CheckButton = ({ className, ...props }: CheckButtonProps) => (
	<Button
		icon
		className={classNames('check-button', className)}
		title="Done"
		{...props}
	/>
);

export default CheckButton;
