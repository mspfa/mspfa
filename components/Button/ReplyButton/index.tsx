import './styles.module.scss';
import type { ButtonProps } from 'components/Button';
import Button from 'components/Button';
import classNames from 'classnames';

export type ReplyButtonProps = Omit<ButtonProps, 'children'>;

const ReplyButton = ({ className, ...props }: ReplyButtonProps) => (
	<Button
		icon
		className={classNames('reply-button', className)}
		title="Reply"
		{...props}
	/>
);

export default ReplyButton;
