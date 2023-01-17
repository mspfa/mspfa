import './styles.module.scss';
import type { ButtonProps } from 'components/Button';
import Button from 'components/Button';
import classes from 'lib/client/classes';

export type RSSButtonProps = ButtonProps;

const RSSButton = ({ className, ...props }: RSSButtonProps) => (
	<Button
		icon
		className={classes('rss-button', className)}
		title="RSS Feed"
		target="_blank"
		{...props}
	/>
);

export default RSSButton;
