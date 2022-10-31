import './styles.module.scss';
import type { ButtonProps } from 'components/Button';
import Button from 'components/Button';
import classNames from 'classnames';

export type RemoveButtonProps = Omit<ButtonProps, 'children'>;

const RemoveButton = ({ className, ...props }: RemoveButtonProps) => (
	<Button
		icon
		className={classNames('remove-button', className)}
		title="Remove"
		{...props}
	/>
);

export default RemoveButton;
