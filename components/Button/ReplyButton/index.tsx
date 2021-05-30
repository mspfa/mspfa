import './styles.module.scss';
import type { ButtonProps } from 'components/Button';
import Button from 'components/Button';

export type ReplyButtonProps = Omit<ButtonProps, 'children'>;

const ReplyButton = ({ className, ...props }: ReplyButtonProps) => (
	<Button
		className={`icon reply${className ? ` ${className}` : ''}`}
		title="Reply"
		{...props}
	/>
);

export default ReplyButton;