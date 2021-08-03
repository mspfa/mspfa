import './styles.module.scss';
import type { ButtonProps } from 'components/Button';
import Button from 'components/Button';

export type RemoveButtonProps = Omit<ButtonProps, 'children'>;

const RemoveButton = ({ className, ...props }: RemoveButtonProps) => (
	<Button
		icon
		className={`remove-button${className ? ` ${className}` : ''}`}
		title="Remove"
		{...props}
	/>
);

export default RemoveButton;