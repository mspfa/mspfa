import './styles.module.scss';
import type { ButtonProps } from 'components/Button';
import Button from 'components/Button';

export type EditButtonProps = Omit<ButtonProps, 'children'>;

const EditButton = ({ className, ...props }: EditButtonProps) => (
	<Button
		className={`icon edit${className ? ` ${className}` : ''}`}
		{...props}
	/>
);

export default EditButton;