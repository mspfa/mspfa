import './styles.module.scss';
import React from 'react';
import type { ButtonHTMLAttributes } from 'react';

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement>;

/**
 * A styled `button` element. Accepts any props which `button` accepts, except `type` which is replaced with the `submit?: boolean` prop.
 *
 * If you want a styled button to function as a `Link`, use `<Link className="button">` instead.
 */
const Button = React.forwardRef<HTMLButtonElement, ButtonProps>((
	{
		type = 'button',
		className,
		...props
	},
	ref
) => {
	const buttonClassName = `button${className ? ` ${className}` : ''}`;

	return (
		<button
			type={type}
			className={buttonClassName}
			{...props}
			ref={ref}
		/>
	);
});

export default Button;