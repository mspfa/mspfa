import './styles.module.scss';
import type { ButtonProps } from 'components/Button';
import Button from 'components/Button';
import classNames from 'classnames';

export type SaveButtonProps = Omit<ButtonProps, 'children'>;

const SaveButton = ({ className, ...props }: SaveButtonProps) => (
	<Button
		icon
		className={classNames('save-button', className)}
		title="Save"
		{...props}
	/>
);

export default SaveButton;
