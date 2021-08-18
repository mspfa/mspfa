import './styles.module.scss';
import React from 'react';
import type { ImgHTMLAttributes } from 'react';

export type IconImageProps = ImgHTMLAttributes<HTMLImageElement> & {
	src?: string,
	// This attribute is required for the sake of accessibility.
	alt: string
};

// This is memoized to prevent the randomized wat face from changing every re-render.
/** Displays a user-submitted icon image (or a wat face if undefined). Default size is 150x150 pixels. */
const IconImage = React.memo(({ src, className, alt, ...props }: IconImageProps) => (
	<img
		className={`icon-image${className ? ` ${className}` : ''}`}
		src={src || `/images/wat/${Math.floor(Math.random() * 4)}.png`}
		alt={alt}
		{...props}
		suppressHydrationWarning
	/>
));

export default IconImage;