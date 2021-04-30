import './styles.module.scss';
import type { HTMLAttributes } from 'react';

export type IconImageProps = HTMLAttributes<HTMLDivElement> & {
	src?: string
};

/** Displays a user-submitted icon image (or a wat face if undefined). Default size is 150x150. */
const IconImage = ({ src, className, style, ...props }: IconImageProps) => (
	<div
		className={`icon-image${className ? ` ${className}` : ''}`}
		style={{
			backgroundImage: `url(${src ? CSS.escape(src) : `/images/wat/${Math.floor(Math.random() * 4)}.png`})`,
			...style
		}}
		{...props}
		suppressHydrationWarning
	/>
);

export default IconImage;