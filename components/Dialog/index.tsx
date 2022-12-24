import type { ActionProps } from 'components/Dialog/Action';
import Action from 'components/Dialog/Action';
import type { DialogContainerProps } from 'components/Dialog/DialogContainer';
import DialogContainer, { useDialogContext } from 'components/Dialog/DialogContainer';
import { dialogElementsUpdater } from 'components/Dialog/Dialogs';
import type { FormikConfig, FormikProps, FormikValues } from 'formik';
import { Form, Formik } from 'formik';
import useFunction from 'lib/client/reactHooks/useFunction';
import type { ReactElement, ReactNode } from 'react';
import React, { Fragment } from 'react';

const isActionElement = (node: ReactNode): node is ReactElement<ActionProps, typeof Action> => (
	React.isValidElement(node) && node.type === Action
);

export type DialogProps<
	Values extends FormikValues = FormikValues
> = Partial<Omit<FormikConfig<Values>, 'initialValues' | 'onSubmit'>> & {
	/** If set, any other dialog with the same `id` will be canceled when this dialog is created. */
	id?: string,
	title: ReactNode,
	initialValues?: Values
};

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
	children,
	...props
}: DialogProps<Values>) => {
	const { dialog, setFormProps, submissionActionRef } = useDialogContext<Action, Values>();

	return (
		<Formik<Values>
			initialValues={initialValues as any}
			onSubmit={
				useFunction(() => {
					dialog.close({
						submitted: true,
						action: submissionActionRef.current
					});
				})
			}
			{...props}
		>
			{props => {
				setFormProps(props);

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

/** The information used to close a dialog. */
export type DialogResolutionOptions<
	Action extends string = string
> = Readonly<{
	/** Whether the user closed the dialog using a submitting action and not a cancelling action. */
	submitted: boolean,
	/** The `value` prop of the `Action` component used to submit the dialog, or undefined if the dialog was canceled and not submitted. */
	action?: Action
}>;

/** The resolution value of a `DialogManager` promise. */
export type DialogResolution<
	Action extends string = string,
	Values extends FormikValues = FormikValues
> = DialogResolutionOptions<Action> & Readonly<{
	/** The dialog's initial Formik values. */
	initialValues: Values,
	/** The dialog's Formik values. */
	values: Values
}>;

/** A promise representing a dialog, returned from `Dialog.create`. */
export type DialogManager<
	Action extends string = string,
	Values extends FormikValues = FormikValues
> = Promise<DialogResolution<Action, Values>> & Readonly<{
	/** Closes the dialog and resolves its promise. */
	close: (options?: DialogResolutionOptions<Action>) => Promise<void>
}>;

let dialogCounter = 0;

Dialog.create = async <
	Action extends string = string,
	Values extends FormikValues = FormikValues
>(
	/** A `Dialog` JSX element, or a function (which can use hooks) that returns one. */
	node: DialogContainerProps['children']
) => {
	if (typeof window === 'undefined') {
		throw new Error('`Dialog.create` must not be called server-side.');
	}

	let formProps: FormikProps<Values>;
	let setFormProps: (props: FormikProps<Values>) => void;

	const formPropsHaveBeenSet = new Promise<void>(resolve => {
		setFormProps = props => {
			formProps = props;

			resolve();
		};
	});

	let resolvePromise: (value: DialogResolution<Action, Values> | PromiseLike<DialogResolution<Action, Values>>) => void;
	const promise = new Promise<DialogResolution<Action, Values>>(resolve => {
		resolvePromise = resolve;
	});

	const close: DialogManager<Action, Values>['close'] = async (
		options = { submitted: false }
	) => {
		await formPropsHaveBeenSet;

		resolvePromise({
			values: formProps.values,
			initialValues: formProps.initialValues,
			...options
		});
	};

	const dialog: DialogManager<Action, Values> = Object.assign(promise, { close });

	const element = (
		<DialogContainer<Action, Values>
			key={dialogCounter++}
			dialog={dialog}
			setFormProps={setFormProps!}
		>
			{node}
		</DialogContainer>
	);

	const open = () => {
		const { updateDialogElements } = dialogElementsUpdater;

		updateDialogElements(dialogElements => {
			dialogElements.push(element);
		});
	};

	open();

	return dialog;
};
