import './styles.module.scss';
import React from 'react';
import type { ImgHTMLAttributes } from 'react';

export type IconImageProps = ImgHTMLAttributes<HTMLImageElement> & {
	src?: string
};

/** Displays a user-submitted icon image (or a wat face if undefined). Default size is 150x150. */
const IconImage = React.memo(({ src, className, ...props }: IconImageProps) => (
	<img
		className={`icon-image${className ? ` ${className}` : ''}`}
		src={src || `/images/wat/${Math.floor(Math.random() * 4)}.png`}
		{...props}
		suppressHydrationWarning
	/>
), (prevProps, nextProps) => prevProps.src === nextProps.src);

export default IconImage;