import './styles.module.scss';
import React from 'react';
import type { ButtonHTMLAttributes } from 'react';
import type { LinkProps } from 'components/Link';
import Link from 'components/Link';

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & LinkProps & {
	href?: LinkProps['href']
};

/** A styled `button` element. Accepts any props which `button` or `Link` accepts. */
const Button = React.forwardRef<HTMLButtonElement & HTMLAnchorElement, ButtonProps>((
	{
		type = 'button',
		className,
		href,
		...props
	},
	ref
) => href ? (
	<Link
		buttonClass
		className={className}
		href={href}
		ref={ref}
		{...props}
	/>
) : (
	<button
		type={type}
		className={`button${className ? ` ${className}` : ''}`}
		ref={ref}
		{...props}
	/>
));

export default Button;