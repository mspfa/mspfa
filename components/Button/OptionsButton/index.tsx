import './styles.module.scss';
import type { ButtonProps } from 'components/Button';
import Button from 'components/Button';

export type OptionsButtonProps = Omit<ButtonProps, 'children'>;

const OptionsButton = ({ className, ...props }: OptionsButtonProps) => (
	<Button
		icon
		className={`options-button${className ? ` ${className}` : ''}`}
		title="Options"
		{...props}
	/>
);

export default OptionsButton;