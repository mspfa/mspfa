import './styles.module.scss';
import type { MutableRefObject } from 'react';
import React, { useContext, useMemo, useRef } from 'react';
import type { FormikProps, FormikValues } from 'formik';
import type { DialogManager } from 'components/Dialog';
import Dialog from 'components/Dialog';

export type DialogContainerProps<
	Action extends string = string,
	Values extends FormikValues = FormikValues
> = {
	/** The value passed into `Dialog.create`. */
	children: JSX.Element | (() => JSX.Element),
	dialog: DialogManager<Action, Values>,
	/** Informs `Dialog.create` of any new value of the dialog's Formik props. */
	setFormProps: (props: FormikProps<Values>) => void
};

export type DialogContextValue<
	Action extends string,
	Values extends FormikValues
> = Pick<DialogContainerProps<Action, Values>, 'dialog' | 'setFormProps'> & {
	/** A ref to the value of `action` that should be set on the `DialogResolution` once the dialog's form is submitted. */
	submissionActionRef: MutableRefObject<Action | undefined>
};

/** A React context provided by `DialogContainer`s and consumed by `Dialog`s. */
const DialogContext = React.createContext<DialogContextValue<any, any>>(undefined as never);

/** A hook that returns various values pertaining to this dialog. */
export const useDialogContext = <
	Action extends string,
	Values extends FormikValues
>(): DialogContextValue<Action, Values> => (
	useContext(DialogContext)
);

const DialogContainerWithoutMemo = <
	Action extends string = string,
	Values extends FormikValues = FormikValues
>({ children, dialog, setFormProps }: DialogContainerProps<Action, Values>) => {
	if (typeof children === 'function') {
		children = children();
	}

	if (!(React.isValidElement(children) && children.type === Dialog)) {
		throw new TypeError('You must pass only a `Dialog` component into `Dialog.create`.');
	}

	const submissionActionRef = useRef<Action | undefined>();

	const dialogContextValue = useMemo(() => ({
		dialog,
		setFormProps,
		submissionActionRef
	}), [dialog, setFormProps]);

	return (
		<DialogContext.Provider value={dialogContextValue}>
			{children}
		</DialogContext.Provider>
	);
};

/**
 * A component which wraps every dialog.
 *
 * ⚠️ This should never directly be used anywhere except in `Dialog.create`.
 */
const DialogContainer = React.memo(DialogContainerWithoutMemo) as typeof DialogContainerWithoutMemo;

export default DialogContainer;
