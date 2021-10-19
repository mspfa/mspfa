import './styles.module.scss';
import type { ButtonProps } from 'components/Button';
import Button from 'components/Button';

export type RSSButtonProps = ButtonProps;

const RSSButton = ({ className, ...props }: RSSButtonProps) => (
	<Button
		icon
		className={`rss-button${className ? ` ${className}` : ''}`}
		title="RSS Feed"
		target="_blank"
		{...props}
	/>
);

export default RSSButton;