import classNames from 'classnames';
import type { ButtonProps } from 'components/Button';
import Button from 'components/Button';
import { useDialogContext } from 'components/Dialog/DialogContainer';
import type { FormikValues } from 'formik';
import { useFormikContext } from 'formik';
import useFunction from 'lib/client/reactHooks/useFunction';
import type { MouseEvent } from 'react';

export type ActionProps<
	Action extends string = string
> = Omit<ButtonProps, 'value'> & {
	/**
	 * Whether this button should cancel the dialog instead of submitting it (and requiring any form fields to be valid).
	 *
	 * Defaults to `false`.
	 */
	cancel?: boolean,
	/**
	 * Whether the dialog should remain open after using this button.
	 *
	 * Defaults to `false`.
	 */
	keepOpen?: boolean,
	/** The value to set the `action` property to on the resolved dialog if the user closes it by clicking this button. */
	value?: Action
};

/** A dialog submission or cancellation button. */
const Action = <
	Action extends string = string,
	Values extends FormikValues = FormikValues
>({
	cancel = false,
	keepOpen = false,
	className,
	value,
	disabled,
	onClick,
	...props
}: ActionProps<Action>) => {
	const { dialog, submissionActionRef } = useDialogContext<Action, Values>();
	const { isSubmitting } = useFormikContext<Values>();

	return (
		<Button
			type={cancel ? 'button' : 'submit'}
			className={classNames('dialog-action', className)}
			value={value}
			disabled={isSubmitting || disabled}
			onClick={
				useFunction((event: MouseEvent<HTMLButtonElement & HTMLAnchorElement>) => {
					onClick?.(event);

					if (keepOpen) {
						return;
					}

					if (!cancel) {
						// Let the dialog form handle this through the `submit` event if the form is valid.
						// If the form is invalid, then no `submit` event will fire, and this value will be either unused or overwritten later.
						submissionActionRef.current = value;
						return;
					}

					dialog.cancel({ action: value });
				})
			}
			{...props}
		/>
	);
};

export default Action;
