import './styles.module.scss';
import React, { useMemo } from 'react';
import type { ImgHTMLAttributes } from 'react';

export type IconImageProps = ImgHTMLAttributes<HTMLImageElement> & {
	src?: string
};

/** Displays a user-submitted icon image (or a wat face if undefined). Default size is 150x150. */
const IconImage = ({ src, className, ...props }: IconImageProps) => (
	<img
		className={`icon-image${className ? ` ${className}` : ''}`}
		src={
			useMemo(() => (
				src || `/images/wat/${Math.floor(Math.random() * 4)}.png`
			), [src])
		}
		{...props}
		suppressHydrationWarning
	/>
);

export default IconImage;