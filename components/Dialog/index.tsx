import React, { useCallback, useEffect } from 'react';
import type { Dialog as DialogClass } from 'modules/client/dialogs';
import { Form, Formik } from 'formik';
import Button from 'components/Button';
import './styles.module.scss';

export type DialogProps = {
	dialog: DialogClass<any>
};

/**
 * The component for a dialog.
 *
 * ⚠️ This should never be rendered anywhere but in the `Dialogs` component's direct children.
 */
const Dialog = React.memo(({ dialog }: DialogProps) => {
	useEffect(() => {
		dialog.open = true;
		if (dialog.onMount) {
			dialog.onMount(dialog);
		}

		return () => {
			dialog.open = false;
		};
	}, [dialog]);

	return (
		<Formik<any>
			initialValues={dialog.initialValues}
			onSubmit={
				useCallback(() => {
					if (dialog.submitAction) {
						dialog.submitAction.onClick();
					} else {
						dialog.resolve({ submit: true });
					}
				}, [dialog])
			}
		>
			{props => {
				dialog.values = props.values;
				dialog.helpers = props;

				return (
					<Form id={`dialog-container-${dialog.id}`} className="dialog-container">
						<dialog id={`dialog-${dialog.id}`} open>
							<div className="dialog-title mid translucent-text">
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
									{dialog.actions.map((action, index) => (
										<Button
											key={index}
											submit={action.submit}
											className="dialog-action"
											autoFocus={action.focus}
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