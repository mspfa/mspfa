import './styles.module.scss';
import type { ActionProps } from 'components/Dialog/Action';
import Action from 'components/Dialog/Action';
import type { DialogContextValue } from 'components/Dialog/DialogContainer';
import DialogContainer, { useDialogContext } from 'components/Dialog/DialogContainer';
import { dialogsState } from 'components/Dialog/Dialogs';
import type { FormikConfig, FormikValues } from 'formik';
import { Form, Formik } from 'formik';
import useFunction from 'lib/client/reactHooks/useFunction';
import useOnChange from 'lib/client/reactHooks/useOnChange';
import type { ReactElement, ReactNode } from 'react';
import React, { Fragment, useEffect } from 'react';

type ActionElement = ReactElement<ActionProps, typeof Action>;

/** Clones the inputted `Action` element, setting its `final` prop to `true`. */
const finalizeAction = (element: ActionElement) => (
	React.cloneElement(element, { final: true })
);

/** Recursively looks for `Action` elements in the inputted `ReactNode`, returning an array of all of them. */
const getFinalActions = (
	node: ReactNode,
	actions: ReactNode[] = []
): ReactNode[] => {
	if (!(node instanceof Object)) {
		return actions;
	}

	if (!React.isValidElement(node)) {
		for (const child of node) {
			getFinalActions(child, actions);
		}
		return actions;
	}

	if (node.type !== Action) {
		return getFinalActions(node.props.children, actions);
	}

	node = finalizeAction(node as ActionElement);

	actions.push(
		node.key === null ? (
			<Fragment key={actions.length}>
				{node}
			</Fragment>
		) : node
	);
	return actions;
};

export type DialogProps<
	Values extends FormikValues = FormikValues
> = Partial<Omit<FormikConfig<Values>, 'initialValues'>> & {
	/** If set, any other dialog with the same `id` will be closed after this dialog is rendered. */
	id?: string,
	title: ReactNode,
	initialValues?: Values
};

/**
 * A component for a dialog box. Can contain `Action` components and Formik fields.
 *
 * If no `Action` components are passed in, the dialog will default to only `Action.OKAY_AUTO_FOCUS`.
 *
 * If this component's child is a function, the dialog's Formik props are passed in, and the return value is used as the dialog's children.
 *
 * ⚠️ Must only be used in `Dialog.create`.
 */
const Dialog = <
	Values extends FormikValues = FormikValues,
	Action extends string = string
>({
	id,
	title,
	initialValues = {} as any,
	onSubmit,
	children,
	...props
}: DialogProps<Values>) => {
	const {
		dialog,
		setDialogProperties,
		formRef,
		submissionActionRef,
		defaultActions
	} = useDialogContext<Values, Action>();

	useOnChange(id, () => {
		throw Error('A `Dialog`\'s `id` prop must never change.');
	});

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

				const content = (
					typeof children === 'function'
						? children(props)
						: children
				);

				let actions = getFinalActions(content);

				if (actions.length === 0) {
					actions = getFinalActions(defaultActions);
				}

				return (
					<Form
						id={id && `dialog-container-${id}`}
						className="dialog-container"
						ref={formRef}
					>
						<dialog
							id={id && `dialog-${id}`}
							open
						>
							<div className="dialog-title alt-front">
								{title}
							</div>
							<div className="dialog-body front">
								<div className="dialog-content">
									{content}
								</div>
								<div className="dialog-actions">
									{actions}
								</div>
							</div>
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
	Values extends FormikValues = FormikValues,
	Action extends string = string
> = Promise<DialogResult<Values, Action>> & Readonly<{
	/** The dialog's `DialogContainer` element. */
	element: JSX.Element,
	/** The value of the `id` prop passed into the `Dialog` component. Undefined if the dialog hasn't been rendered yet. */
	id?: string,
	/** Whether `submit` or `cancel` has been called on the dialog. */
	closed: boolean,
	/** Closes the dialog, never resolving its promise. Does nothing if the dialog is already closed. */
	remove: () => Promise<void>,
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
export type DialogResult<
	Values extends FormikValues = FormikValues,
	Action extends string = string
> = (
	Readonly<DialogCloseOptions<Action>>
	& Pick<DialogManager<Values, Action>, 'id'>
	& Required<Pick<DialogManager<Values, Action>, 'initialValues' | 'values'>>
) & Readonly<{
	/** Whether the dialog was canceled rather than submitted. */
	canceled: boolean
}>;

let dialogCounter = 0;

Dialog.create = <
	Values extends FormikValues = FormikValues,
	Action extends string = string
>(
	/** A `Dialog` element, or a function (which can use hooks) that returns one. */
	node: JSX.Element | (() => JSX.Element),
	/**
	 * A node containing the `Action` components to use when there are none in the `Dialog` component's children.
	 *
	 * ⚠️ Always pass `Action`s into the `Dialog` component's children instead whenever possible.
	 */
	defaultActions: ReactNode = Action.OKAY_AUTO_FOCUS
): DialogManager<Values, Action> => {
	if (typeof window === 'undefined') {
		throw new Error('`Dialog.create` must not be called server-side.');
	}

	let setDialogProperties: DialogContextValue<Values, Action>['setDialogProperties'];
	const dialogRendered = new Promise<void>(resolve => {
		setDialogProperties = properties => {
			Object.assign(dialog, properties);

			resolve();
		};
	});

	let resolvePromise: (value: DialogResult<Values, Action> | PromiseLike<DialogResult<Values, Action>>) => void;
	const promise = new Promise<DialogResult<Values, Action>>(resolve => {
		resolvePromise = resolve;
	});

	const close = async (
		type: 'remove' | 'submit' | 'cancel',
		options?: DialogCloseOptions<Action>
	) => {
		if (dialog.closed) {
			return;
		}

		const [, updateDialogs] = dialogsState;
		updateDialogs(dialogs => {
			const dialogIndex = dialogs.indexOf(dialog);
			dialogs.splice(dialogIndex, 1);
		});

		Object.assign(dialog, { closed: true });

		if (type === 'remove') {
			return;
		}

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

	const dialog: DialogManager<Values, Action> = Object.assign(promise, {
		closed: false,
		remove: () => close('remove'),
		submit: options => close('submit', options),
		cancel: options => close('cancel', options),
		element: undefined as never
	} satisfies Partial<DialogManager<Values, Action>>);

	const element = (
		<DialogContainer<Values, Action>
			key={dialogCounter++}
			dialog={dialog}
			setDialogProperties={setDialogProperties!}
			defaultActions={defaultActions}
		>
			{node}
		</DialogContainer>
	);

	Object.assign(dialog, {
		element
	} satisfies Partial<DialogManager<Values, Action>>);

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
	Values extends FormikValues = FormikValues,
	Action extends string = string
>(id: string) => (
	dialogsByID[id] as DialogManager<Values, Action> | undefined
);

/** Equivalent to `Dialog.create`, but resolves to a boolean of whether the dialog was submitted rather than canceled, and the default actions are `Action.YES_AUTO_COMPLETE` and `Action.NO`. */
Dialog.confirm = async (...[
	node,
	defaultActions = [Action.YES_AUTO_FOCUS, Action.NO]
]: Parameters<typeof Dialog.create>) => {
	const dialog = await Dialog.create(node, defaultActions);

	return !dialog.canceled;
};
