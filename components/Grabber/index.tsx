import './styles.module.scss';
import type { IconProps } from 'components/Icon';
import Icon from 'components/Icon';

export type GrabberProps = IconProps;

const Grabber = ({ className, ...props }: GrabberProps) => (
	<Icon
		className={`grabber${className ? ` ${className}` : ''}`}
		{...props}
	/>
);

export default Grabber;