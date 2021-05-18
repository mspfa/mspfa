import './styles.module.scss';
import type { ButtonProps } from 'components/Button';
import Button from 'components/Button';

export type RemoveButtonProps = Omit<ButtonProps, 'children'>;

const RemoveButton = ({ className, ...props }: RemoveButtonProps) => (
	<Button
		className={`icon remove${className ? ` ${className}` : ''}`}
		title="Remove"
		{...props}
	/>
);

export default RemoveButton;