import './styles.module.scss';
import type { MutableRefObject, ReactElement, ReactNode } from 'react';
import React, { useContext, useMemo, useRef } from 'react';
import type { FormikValues } from 'formik';
import type { ResolvedDialog } from 'components/Dialog';
import Dialog from 'components/Dialog';

export type DialogContextValue<
	Action extends string,
	Values extends FormikValues
> = Pick<DialogContainerProps<Action, Values>, 'resolve'> & {
	/** A ref to the value of `action` that should be set on the resolved dialog. */
	submittedActionRef: MutableRefObject<Action | undefined>
};

/**
 * A React context provided by `DialogContainer`s and consumed by `Dialog`s.
 *
 * ⚠️ Calling `useContext` on this is not type-safe. Call `useDialogContext` with type arguments instead.
 */
export const DialogContext = React.createContext<DialogContextValue<any, any>>(undefined as never);

/** Consumes `DialogContext`. */
export const useDialogContext = <
	Action extends string,
	Values extends FormikValues
>(): DialogContextValue<Action, Values> => (
	useContext(DialogContext)
);

export type DialogContainerProps<
	Action extends string = string,
	Values extends FormikValues = FormikValues
> = {
	/** The value passed into `Dialog.create`. */
	children: JSX.Element | (() => JSX.Element),
	/** Resolves `Dialog.create`'s promise and closes the dialog. */
	resolve: (value: ResolvedDialog<Action, Values> | PromiseLike<ResolvedDialog<Action, Values>>) => void
};

const isDialogElement = (node: ReactNode) => (
	React.isValidElement(node) && node.type === Dialog
);

const DialogContainerWithoutMemo = <
	Action extends string = string,
	Values extends FormikValues = FormikValues
>({
	children,
	resolve
}: DialogContainerProps<Action, Values>) => {
	if (typeof children === 'function') {
		children = children();
	}

	if (!isDialogElement(children)) {
		throw new TypeError('You must pass only a `Dialog` component into `Dialog.create`.');
	}

	const submittedActionRef = useRef<Action | undefined>();

	return (
		<DialogContext.Provider
			value={
				useMemo(() => ({ resolve, submittedActionRef }), [resolve])
			}
		>
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

export type DialogContainerElement = ReactElement<DialogContainerProps, typeof DialogContainer>;
