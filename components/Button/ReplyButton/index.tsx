import './styles.module.scss';
import type { ButtonProps } from 'components/Button';
import Button from 'components/Button';

export type ReplyButtonProps = Omit<ButtonProps, 'children'>;

const ReplyButton = ({ className, ...props }: ReplyButtonProps) => (
	<Button
		icon
		className={`reply-button${className ? ` ${className}` : ''}`}
		title="Reply"
		{...props}
	/>
);

export default ReplyButton;