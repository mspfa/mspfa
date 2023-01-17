import classes from 'lib/client/classes';
import type { ButtonProps } from 'components/Button';
import Button from 'components/Button';
import { useDialogContext } from 'components/Dialog/DialogContainer';
import type { FormikValues } from 'formik';
import { useFormikContext } from 'formik';
import useFunction from 'lib/client/reactHooks/useFunction';
import type { MouseEvent } from 'react';
import React from 'react';

export type ActionProps<
	Action extends string = string
> = Omit<ButtonProps, 'value'> & {
	/** Whether this component is being rendered in its final location. */
	final?: boolean,
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
	value?: Action,
	/** Defaults to the form's `isSubmitting` value. */
	disabled?: boolean
};

/**
 * A dialog submission or cancellation button.
 *
 * Must be passed into the `Dialog`'s children, not returned from a component passed into the `Dialog`'s children.
 */
const Action = <
	Values extends FormikValues = FormikValues,
	Action extends string = string
>({
	final,
	cancel = false,
	keepOpen = false,
	className,
	value,
	disabled,
	onClick: onClickProp,
	...props
}: ActionProps<Action>) => {
	const { dialog, formRef, submissionActionRef } = useDialogContext<Values, Action>();
	const { isSubmitting } = useFormikContext<Values>();

	const onClick = useFunction((event: MouseEvent<HTMLButtonElement & HTMLAnchorElement>) => {
		if (cancel || formRef.current.reportValidity()) {
			onClickProp?.(event);
		}

		if (keepOpen) {
			return;
		}

		if (cancel) {
			dialog.cancel({ action: value });
			return;
		}

		// Let the dialog form handle this through the `submit` event if the form is valid.
		// If the form is invalid, then no `submit` event will fire, and this value will be either unused or overwritten later.
		submissionActionRef.current = value;
	});

	if (!final) {
		return null;
	}

	return (
		<Button
			type={cancel ? 'button' : 'submit'}
			className={classes('dialog-action', className)}
			value={value}
			disabled={disabled ?? isSubmitting}
			onClick={onClick}
			{...props}
		/>
	);
};

export default Action;

Action.OKAY = <Action>Okay</Action>;

Action.OKAY_AUTO_FOCUS = React.cloneElement(Action.OKAY, { autoFocus: true });

Action.CANCEL = <Action cancel>Cancel</Action>;

Action.YES = <Action>Yes</Action>;

Action.YES_AUTO_FOCUS = React.cloneElement(Action.YES, { autoFocus: true });

Action.NO = <Action cancel>No</Action>;
