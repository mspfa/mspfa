import './styles.module.scss';
import type { ButtonProps } from 'components/Button';
import Button from 'components/Button';
import classNames from 'classnames';

export type OptionsButtonProps = Omit<ButtonProps, 'children'>;

const OptionsButton = ({ className, ...props }: OptionsButtonProps) => (
	<Button
		icon
		className={classNames('options-button', className)}
		title="Options"
		{...props}
	/>
);

export default OptionsButton;
