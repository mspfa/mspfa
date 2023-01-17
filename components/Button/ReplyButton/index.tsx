import './styles.module.scss';
import type { ButtonProps } from 'components/Button';
import Button from 'components/Button';
import classes from 'lib/client/classes';

export type ReplyButtonProps = Omit<ButtonProps, 'children'>;

const ReplyButton = ({ className, ...props }: ReplyButtonProps) => (
	<Button
		icon
		className={classes('reply-button', className)}
		title="Reply"
		{...props}
	/>
);

export default ReplyButton;
