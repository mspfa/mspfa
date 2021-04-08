import React from 'react';
import type { ButtonHTMLAttributes } from 'react';
import './styles.module.scss';

type HTMLButtonProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'type'>;
export type ButtonProps = HTMLButtonProps & {
	/** Whether this button has `type="submit"` rather than `type="button"`. */
	submit?: boolean
};

/** A styled `button` element. Accepts any props which `button` accepts, except `type` which is replaced with the `submit?: boolean` prop. */
const Button = React.forwardRef((
	{ submit, children, className, ...props }: ButtonProps,
	ref: React.ForwardedRef<HTMLButtonElement & HTMLButtonElement>
) => {
	const buttonClassName = `button${className ? ` ${className}` : ''}`;

	return (
		<button
			type={submit ? 'submit' : 'button'}
			className={buttonClassName}
			{...props}
			ref={ref}
		>
			{children}
		</button>
	);
});

export default Button;