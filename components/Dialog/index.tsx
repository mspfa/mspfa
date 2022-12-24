import type { ActionProps } from 'components/Dialog/Action';
import Action from 'components/Dialog/Action';
import type { DialogContainerProps } from 'components/Dialog/DialogContainer';
import DialogContainer, { useDialogContext } from 'components/Dialog/DialogContainer';
import { dialogsUpdater } from 'components/Dialog/Dialogs';
import type { FormikConfig, FormikValues } from 'formik';
import { Form, Formik } from 'formik';
import useFunction from 'lib/client/reactHooks/useFunction';
import type { ReactElement, ReactNode } from 'react';
import React, { Fragment } from 'react';

export type ResolvedDialog<
	Action extends string,
	Values extends FormikValues
> = Readonly<{
	/** The dialog's initial Formik values. */
	initialValues: Values,
	/** The dialog's Formik values. */
	values: Values,
	/** Whether the user closed the dialog using a submitting action and not a cancelling action. */
	submitted: boolean,
	/** The `value` prop of the `Action` component used to submit the dialog, or undefined if the dialog was canceled and not submitted. */
	action?: Action
}>;

export type DialogProps<
	Values extends FormikValues = FormikValues
> = Partial<Omit<FormikConfig<Values>, 'initialValues' | 'onSubmit'>> & {
	/** If set, any other dialog with the same `id` will be canceled when this dialog is created. */
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
	children,
	...props
}: DialogProps<Values>) => {
	const { resolve, submittedActionRef } = useDialogContext<Action, Values>();

	return (
		<Formik<Values>
			initialValues={initialValues as any}
			onSubmit={
				useFunction(values => {
					resolve({
						initialValues,
						values,
						submitted: true,
						action: submittedActionRef.current
					});
				})
			}
			{...props}
		>
			{props => {
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

let dialogCounter = 0;

Dialog.create = <
	Action extends string = string,
	Values extends FormikValues = FormikValues
>(
	/** A `Dialog` JSX element, or a function (which can use hooks) that returns one. */
	node: DialogContainerProps['children']
) => new Promise<ResolvedDialog<Action, Values>>(resolve => {
	if (typeof window === 'undefined') {
		throw new Error('`Dialog.create` must not be called server-side.');
	}

	const open = () => {
		dialogsUpdater.updateDialogs(dialogs => {
			dialogs.push(container);
		});
	};

	const close = () => {
		dialogsUpdater.updateDialogs(dialogs => {
			const containerIndex = dialogs.indexOf(container);
			dialogs.splice(containerIndex, 1);
		});
	};

	const container = (
		<DialogContainer<Action, Values>
			key={dialogCounter++}
			// This ESLint comment is necessary because ESLint doesn't know this can never re-render since we aren't inside a component. Hooks don't even work here.
			// eslint-disable-next-line react/jsx-no-bind
			resolve={value => {
				resolve(value);
				close();
			}}
		>
			{node}
		</DialogContainer>
	);

	open();
});
