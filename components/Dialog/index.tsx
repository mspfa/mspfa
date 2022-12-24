import type { ActionProps } from 'components/Dialog/Action';
import Action from 'components/Dialog/Action';
import type { DialogContainerProps, DialogContextValue } from 'components/Dialog/DialogContainer';
import DialogContainer, { useDialogContext } from 'components/Dialog/DialogContainer';
import { dialogsState } from 'components/Dialog/Dialogs';
import type { FormikConfig, FormikValues } from 'formik';
import { Form, Formik } from 'formik';
import useFunction from 'lib/client/reactHooks/useFunction';
import type { ReactElement, ReactNode } from 'react';
import React, { Fragment, useEffect, useRef } from 'react';

export type DialogProps<
	Values extends FormikValues = FormikValues
> = Partial<Omit<FormikConfig<Values>, 'initialValues'>> & {
	/** If set, any other dialog with the same `id` will be closed after this dialog is rendered. */
	id?: string,
	title: ReactNode,
	initialValues?: Values
};

const isActionElement = (node: ReactNode): node is ReactElement<ActionProps, typeof Action> => (
	React.isValidElement(node) && node.type === Action
);

/**
 * A component for a dialog box. Can contain `Action` components and Formik fields.
 *
 * If this component's child is a function, the dialog's Formik props are passed in.
 *
 * ⚠️ Should only be passed into `Dialog.create`.
 */
const Dialog = <
	Action extends string = string,
	Values extends FormikValues = FormikValues
>({
	id,
	title,
	initialValues = {} as any,
	onSubmit,
	children,
	...props
}: DialogProps<Values>) => {
	const { dialog, setDialogProperties, submissionActionRef } = useDialogContext<Action, Values>();

	const initialIDRef = useRef(id);
	if (initialIDRef.current !== id) {
		throw Error('A `Dialog`\'s `id` prop must never change.');
	}

	// Close any other dialog with the same `id` as this one.
	useEffect(() => {
		if (id === undefined) {
			return;
		}

		const conflictingDialog = Dialog.getByID(id);
		if (conflictingDialog !== dialog) {
			conflictingDialog?.cancel();
		}

		dialogsByID[id] = dialog;

		return () => {
			if (Dialog.getByID(id) !== dialog) {
				return;
			}

			delete dialogsByID[id];
		};
	}, [dialog, id]);

	return (
		<Formik<Values>
			initialValues={initialValues as any}
			onSubmit={
				useFunction(async (...args) => {
					await onSubmit?.(...args);

					dialog.submit({
						action: submissionActionRef.current
					});
				})
			}
			{...props}
		>
			{props => {
				setDialogProperties({
					id,
					initialValues: props.initialValues,
					values: props.values
				});

				if (typeof children === 'function') {
					children = children(props);
				}

				const childrenArray = (
					Array.isArray(children)
						? children as ReactNode[]
						: [children]
				);

				const actions = [];
				const childrenWithoutActions = [];

				for (let i = 0; i < childrenArray.length; i++) {
					const node = childrenArray[i];

					if (!isActionElement(node)) {
						childrenWithoutActions.push(node);
						continue;
					}

					if (node.key !== null) {
						actions.push(node);
						continue;
					}

					actions.push(
						<Fragment key={i}>
							{node}
						</Fragment>
					);
				}

				return (
					<Form className="dialog-container">
						<dialog open>
							<div className="dialog-title alt-front">
								{title}
							</div>
							<div className="dialog-content front">
								{childrenWithoutActions}
							</div>
							{actions.length !== 0 && (
								<div className="dialog-actions front">
									{actions.map((action, i) => (
										<Fragment key={i}>
											{action}
										</Fragment>
									))}
								</div>
							)}
						</dialog>
					</Form>
				);
			}}
		</Formik>
	);
};

export default Dialog;

/** A promise representing a dialog, returned from `Dialog.create`. */
export type DialogManager<
	Action extends string = string,
	Values extends FormikValues = FormikValues
> = Promise<DialogResolution<Action, Values>> & Readonly<{
	/** The dialog's `DialogContainer` element. */
	element: JSX.Element,
	/** The value of the `id` prop passed into the `Dialog` component. Undefined if the dialog hasn't been rendered yet. */
	id?: string,
	/** Whether `submit` or `cancel` has been called on the dialog. */
	closed: boolean,
	/** Closes the dialog as a submission (without submitting its form) and resolves its promise. Does nothing if the dialog is already closed. */
	submit: (options?: DialogCloseOptions<Action>) => Promise<void>,
	/** Closes the dialog as a cancellation and resolves its promise. Does nothing if the dialog is already closed. */
	cancel: (options?: DialogCloseOptions<Action>) => Promise<void>,
	/** The dialog's initial Formik values. */
	initialValues?: Values,
	/** The dialog's Formik values. */
	values?: Values
}>;

/** The options for a dialog's `submit` or `cancel` method. */
export type DialogCloseOptions<
	Action extends string = string
> = {
	/** The `value` prop of the `Action` component used to submit the dialog, or undefined if the dialog was canceled and not submitted. */
	action?: Action
};

/** The resolution value of a `DialogManager` promise. */
export type DialogResolution<
	Action extends string = string,
	Values extends FormikValues = FormikValues
> = (
	Readonly<DialogCloseOptions<Action>>
	& Pick<DialogManager<Action, Values>, 'id'>
	& Required<Pick<DialogManager<Action, Values>, 'initialValues' | 'values'>>
) & Readonly<{
	/** Whether the dialog was canceled rather than submitted. */
	canceled: boolean
}>;

let dialogCounter = 0;

Dialog.create = async <
	Action extends string = string,
	Values extends FormikValues = FormikValues
>(
	/** A `Dialog` JSX element, or a function (which can use hooks) that returns one. */
	node: DialogContainerProps['children']
): Promise<DialogManager<Action, Values>> => {
	if (typeof window === 'undefined') {
		throw new Error('`Dialog.create` must not be called server-side.');
	}

	let setDialogProperties: DialogContextValue<Action, Values>['setDialogProperties'];
	const dialogRendered = new Promise<void>(resolve => {
		setDialogProperties = properties => {
			Object.assign(dialog, properties);

			resolve();
		};
	});

	let resolvePromise: (value: DialogResolution<Action, Values> | PromiseLike<DialogResolution<Action, Values>>) => void;
	const promise = new Promise<DialogResolution<Action, Values>>(resolve => {
		resolvePromise = resolve;
	});

	const close = async (
		type: 'submit' | 'cancel',
		options?: DialogCloseOptions<Action>
	) => {
		if (dialog.closed) {
			return;
		}

		Object.assign(dialog, { closed: true });

		await dialogRendered;

		resolvePromise({
			id: dialog.id,
			canceled: type === 'cancel',
			action: options?.action,
			// These can be asserted as non-nullable because they were set by `setDialogProperties` when the `Dialog` component was rendered.
			values: dialog.values!,
			initialValues: dialog.initialValues!
		});
	};

	const submit: DialogManager<Action, Values>['submit'] = options => close('submit', options);
	const cancel: DialogManager<Action, Values>['cancel'] = options => close('cancel', options);

	const dialog: DialogManager<Action, Values> = Object.assign(promise, {
		closed: false,
		submit,
		cancel,
		element: undefined as never
	});

	const element = (
		<DialogContainer<Action, Values>
			key={dialogCounter++}
			dialog={dialog}
			setDialogProperties={setDialogProperties!}
		>
			{node}
		</DialogContainer>
	);

	Object.assign(dialog, { element });

	const open = () => {
		const [, updateDialogs] = dialogsState;

		updateDialogs(dialogs => {
			dialogs.push(dialog);
		});
	};

	open();

	return dialog;
};

const dialogsByID: Record<string, DialogManager<any, any>> = {};

/** Gets the `DialogManager` with the specified `id`. */
Dialog.getByID = <
	Action extends string = string,
	Values extends FormikValues = FormikValues
>(id: string) => (
	dialogsByID[id] as DialogManager<Action, Values> | undefined
);

Dialog.OKAY = <Action>Okay</Action>;

Dialog.OKAY_AUTO_FOCUS = React.cloneElement(Dialog.OKAY, { autoFocus: true });

Dialog.CANCEL = <Action cancel>Cancel</Action>;

Dialog.YES = <Action>Yes</Action>;

Dialog.YES_AUTO_FOCUS = React.cloneElement(Dialog.YES, { autoFocus: true });

Dialog.NO = <Action cancel>No</Action>;

/** Equivalent to `Dialog.create`, but resolves to a boolean of whether the dialog was submitted and not canceled. */
Dialog.confirm = async (...args: Parameters<typeof Dialog.create>) => (
	!(await Dialog.create(...args)).canceled
);
