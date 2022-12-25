import './styles.module.scss';
import type { MutableRefObject, ReactNode } from 'react';
import React, { useContext, useMemo, useRef } from 'react';
import type { FormikValues } from 'formik';
import type { DialogManager, DialogResolution } from 'components/Dialog';
import Dialog from 'components/Dialog';

export type DialogContainerProps<
	Values extends FormikValues = FormikValues,
	Action extends string = string
> = {
	/** The value passed into `Dialog.create`. */
	children: JSX.Element | (() => JSX.Element),
	dialog: DialogManager<Values, Action>,
	/** Sets the `id`, `initialValues`, and `values` properties on the `DialogManager` as soon as they're all known. */
	setDialogProperties: (properties: Pick<DialogResolution<Values, Action>, 'id' | 'initialValues' | 'values'>) => void
};

export type DialogContextValue<
	Values extends FormikValues,
	Action extends string
> = Pick<DialogContainerProps<Values, Action>, 'dialog' | 'setDialogProperties'> & {
	/** A ref to the value of `action` that should be set on the `DialogResolution` once the dialog's form is submitted. */
	submissionActionRef: MutableRefObject<Action | undefined>
};

/** A React context provided by `DialogContainer`s and consumed by `Dialog`s. */
const DialogContext = React.createContext<DialogContextValue<any, any>>(undefined as never);

/** A hook that returns various values pertaining to this dialog. */
export const useDialogContext = <
	Values extends FormikValues,
	Action extends string
>(): DialogContextValue<Values, Action> => (
	useContext(DialogContext)
);

const isDialogElement = (node: ReactNode) => (
	React.isValidElement(node) && node.type === Dialog
);

const DialogContainerWithoutMemo = <
	Values extends FormikValues = FormikValues,
	Action extends string = string
>({ children, dialog, setDialogProperties }: DialogContainerProps<Values, Action>) => {
	if (typeof children === 'function') {
		children = children();
	}

	if (!isDialogElement(children)) {
		throw new TypeError('You must pass only a `Dialog` component into `Dialog.create`.');
	}

	const submissionActionRef = useRef<Action | undefined>();

	const dialogContextValue = useMemo(() => ({
		dialog,
		setDialogProperties,
		submissionActionRef
	}), [dialog, setDialogProperties]);

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
