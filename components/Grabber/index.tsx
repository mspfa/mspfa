import './styles.module.scss';
import type { IconProps } from 'components/Icon';
import Icon from 'components/Icon';
import useFunction from 'lib/client/reactHooks/useFunction';
import type { DragEvent } from 'react';
import { useState } from 'react';

export type GrabberProps = Omit<IconProps, 'draggable'>;

const Grabber = ({ className, onDragStart, onDragEnd, ...props }: GrabberProps) => {
	const [dragging, setDragging] = useState(false);

	return (
		<Icon
			className={`grabber${dragging ? ' dragging' : ''}${className ? ` ${className}` : ''}`}
			draggable
			onDragStart={
				useFunction((event: DragEvent<HTMLDivElement>) => {
					setDragging(true);

					onDragStart?.(event);
				})
			}
			onDragEnd={
				useFunction((event: DragEvent<HTMLDivElement>) => {
					setDragging(false);

					onDragEnd?.(event);
				})
			}
			{...props}
		/>
	);
};

export default Grabber;