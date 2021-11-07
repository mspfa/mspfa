import './styles.module.scss';
import React from 'react';
import type { ButtonHTMLAttributes } from 'react';
import type { LinkProps } from 'components/Link';
import Link from 'components/Link';
import type { IconProps } from 'components/Icon';
import Icon from 'components/Icon';

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & Omit<LinkProps, 'buttonClass'> & {
	/**
	 * Whether this is an icon button. This adds an `icon-button` class to the button element and inserts an `Icon` component as the button's first child.
	 *
	 * The `Icon`'s props can also be passed here instead of `true`.
	 */
	icon?: boolean | IconProps,
	href?: LinkProps['href']
};

/** A styled `button` element. Accepts any props which `button` or `Link` accepts. */
const Button = React.forwardRef<HTMLButtonElement & HTMLAnchorElement, ButtonProps>(({
	type = 'button',
	icon,
	className,
	href,
	children,
	...props
}, ref) => {
	const hasChildren = !(
		children === undefined
		|| children === null
		|| children === false
	);

	if (icon) {
		className = `icon-button${hasChildren ? ' labeled' : ''}${className ? ` ${className}` : ''}`;

		children = (
			<Icon {...icon}>
				{children}
			</Icon>
		);
	} else {
		children = hasChildren && (
			<span className="button-label">
				{children}
			</span>
		);
	}

	return href ? (
		<Link
			buttonClass
			className={className}
			href={href}
			ref={ref}
			{...props}
		>
			{children}
		</Link>
	) : (
		<button
			type={type}
			className={`button${className ? ` ${className}` : ''}`}
			ref={ref}
			{...props}
		>
			{children}
		</button>
	);
});

export default Button;