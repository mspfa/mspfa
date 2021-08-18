import './styles.module.scss';
import React, { useRef } from 'react';
import useFunction from 'lib/client/useFunction';
import type { default as DialogClass } from 'lib/client/Dialog';
import { Form, Formik } from 'formik';
import Button from 'components/Button';
import toKebabCase from 'lib/client/toKebabCase';
import { useIsomorphicLayoutEffect } from 'react-use';

export type DialogProps = {
	dialog: DialogClass<any>
};

/**
 * The component for a dialog.
 *
 * ⚠️ This should never be rendered anywhere but in the `Dialogs` component's direct children.
 */
const Dialog = React.memo(({ dialog }: DialogProps) => {
	const idKebab = toKebabCase(dialog.id.toString());

	const dialogRef = useRef<HTMLElement>(null!);

	useIsomorphicLayoutEffect(() => {
		dialog.open = true;

		const dialogElement = dialogRef.current;

		return () => {
			dialog.open = false;

			// It is necessary to store `parentNode` in a variable so it does not become `null` after `removeChild` is called below.
			const { parentNode } = dialogElement;
			if (parentNode) {
				// Replay the dialog pop animation.
				parentNode.removeChild(dialogElement);
				parentNode.appendChild(dialogElement);
			}
		};
	}, [dialog]);

	return (
		<Formik<any>
			initialValues={dialog.initialValues}
			onSubmit={
				useFunction(() => {
					if (dialog.submitAction) {
						dialog.submitAction.onClick();
					} else {
						dialog.resolve({ submit: true });
					}
				})
			}
		>
			{props => {
				dialog.form = props;

				return (
					<Form id={`dialog-container-${idKebab}`} className="dialog-container">
						<dialog
							id={`dialog-${idKebab}`}
							open
							ref={dialogRef}
						>
							<div className="dialog-title front-alt">
								{dialog.title}
							</div>
							<div className="dialog-content front">
								{(typeof dialog.content === 'function'
									? dialog.content(props)
									: dialog.content
								)}
							</div>
							{!!dialog.actions.length && (
								<div className="dialog-actions front">
									{dialog.actions.map((action, i) => (
										<Button
											key={i}
											type={action.submit ? 'submit' : 'button'}
											className="dialog-action"
											autoFocus={action.autoFocus}
											onClick={action.submit ? undefined : action.onClick}
										>
											{action.label}
										</Button>
									))}
								</div>
							)}
						</dialog>
					</Form>
				);
			}}
		</Formik>
	);
});

export default Dialog;