import './styles.module.scss';
import type { MutableRefObject, ReactNode } from 'react';
import React, { useContext, useMemo, useRef } from 'react';
import type { FormikValues } from 'formik';
import type { DialogManager, DialogResult } from 'components/Dialog';
import Dialog from 'components/Dialog';

export type DialogContainerProps<
	Values extends FormikValues = FormikValues,
	Action extends string = string
> = {
	/** The value which was passed into `Dialog.create`. */
	children: Parameters<typeof Dialog.create<Values, Action>>[0],
	dialog: DialogManager<Values, Action>,
	/** Sets the `id`, `initialValues`, and `values` properties on the `DialogManager` as soon as they're all known. */
	setDialogProperties: (properties: Pick<DialogResult<Values, Action>, 'id' | 'initialValues' | 'values'>) => void,
	defaultActions: Parameters<typeof Dialog.create<Values, Action>>[1]
};

export type DialogContextValue<
	Values extends FormikValues,
	Action extends string
> = Omit<DialogContainerProps<Values, Action>, 'children'> & {
	/** A ref to the value of `action` that should be set on the `DialogResult` once the dialog's form is submitted. */
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

const DialogContainerWithoutMemo = <
	Values extends FormikValues = FormikValues,
	Action extends string = string
>({
	children,
	dialog,
	setDialogProperties,
	defaultActions
}: DialogContainerProps<Values, Action>) => {
	const dialogElement = (
		typeof children === 'function'
			? children()
			: children
	);

	const submissionActionRef = useRef<Action | undefined>();

	const dialogContextValue = useMemo(() => ({
		dialog,
		setDialogProperties,
		submissionActionRef,
		defaultActions
	}), [dialog, setDialogProperties, defaultActions]);

	return (
		<DialogContext.Provider value={dialogContextValue}>
			{dialogElement}
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
