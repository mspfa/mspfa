import './styles.module.scss';
import type { IconProps } from 'components/Icon';
import Icon from 'components/Icon';

export type GrabberProps = Omit<IconProps, 'draggable'>;

const Grabber = ({ className, ...props }: GrabberProps) => (
	<Icon
		className={`grabber${className ? ` ${className}` : ''}`}
		draggable
		{...props}
	/>
);

export default Grabber;