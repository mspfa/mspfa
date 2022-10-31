import './styles.module.scss';
import type { ButtonProps } from 'components/Button';
import Button from 'components/Button';
import classNames from 'classnames';

export type RSSButtonProps = ButtonProps;

const RSSButton = ({ className, ...props }: RSSButtonProps) => (
	<Button
		icon
		className={classNames('rss-button', className)}
		title="RSS Feed"
		target="_blank"
		{...props}
	/>
);

export default RSSButton;
