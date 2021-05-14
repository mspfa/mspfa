import './styles.module.scss';
import React from 'react';
import type { ButtonHTMLAttributes } from 'react';
import type { LinkProps } from 'components/Link';
import Link from 'components/Link';

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & LinkProps & {
	href?: LinkProps['href']
};

/** A styled `button` element. Accepts any props which `button` or `Link` accepts. */
const Button = React.forwardRef<HTMLButtonElement, ButtonProps>((
	{
		type = 'button',
		className,
		href,
		...props
	},
	ref
) => {
	const buttonClassName = `button${className ? ` ${className}` : ''}`;

	return href ? (
		<Link
			className={buttonClassName}
			href={href}
			{...props}
		/>
	) : (
		<button
			type={type}
			className={buttonClassName}
			{...props}
			ref={ref}
		/>
	);
});

export default Button;