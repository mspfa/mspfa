import './styles.module.scss';
import type { ButtonProps } from 'components/Button';
import Button from 'components/Button';
import classNames from 'classnames';

export type EditButtonProps = Omit<ButtonProps, 'children'>;

const EditButton = ({ className, ...props }: EditButtonProps) => (
	<Button
		icon
		className={classNames('edit-button', className)}
		title="Edit"
		{...props}
	/>
);

export default EditButton;
