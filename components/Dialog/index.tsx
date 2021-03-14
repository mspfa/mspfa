import React, { useCallback, useEffect, useRef } from 'react';
import type { Dialog as DialogClass } from 'modules/dialogs';
import { dialogs } from 'modules/dialogs';
import './styles.module.scss';

export type DialogProps = {
	dialog: DialogClass
};

const Dialog = React.memo(({ dialog }: DialogProps) => {
	const formRef = useRef<HTMLFormElement>(null);
	
	useEffect(() => {
		dialog.open = true;
		dialog.form = formRef.current!;
		
		const autoFocused = dialog.form.querySelector('[autofocus]');
		if (autoFocused instanceof HTMLElement) {
			autoFocused.focus();
		}
		
		return () => {
			dialog.open = false;
		};
	}, [dialog]);
	
	return (
		<form
			className="dialog-container"
			ref={formRef}
			onSubmit={
				useCallback((evt: React.FormEvent<HTMLFormElement>) => {
					evt.preventDefault();
					dialog.resolve(dialog.submitAction);
				}, [dialog])
			}
			onClick={
				useCallback((evt: React.FormEvent<HTMLFormElement>) => {
					// Check to make sure the user didn't click inside the dialog.
					if (evt.target === formRef.current) {
						// The user clicked outside the dialog, so resolve the dialog with `undefined`.
						dialog.resolve();
					}
				}, [dialog])
			}
		>
			<dialog className="dialog" open>
				<div className="dialog-title">
					{dialog.title}
				</div>
				<div className="dialog-content">
					{dialog.content}
				</div>
				<div className="dialog-actions">
					{dialog.actions.map((action, index) => (
						<button
							key={index}
							type={action.submit ? 'submit' : 'button'}
							className="dialog-action"
							autoFocus={action.focus}
							onClick={action.onClick}
						>
							{action.label}
						</button>
					))}
				</div>
			</dialog>
		</form>
	);
});

export default Dialog;