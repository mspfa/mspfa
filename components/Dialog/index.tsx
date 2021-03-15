import React, { useCallback, useEffect, useRef } from 'react';
import type { Dialog as DialogClass } from 'modules/dialogs';
import './styles.module.scss';

export type DialogProps = {
	dialog: DialogClass
};

let containerPressed = false;

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
			onPointerDown={
				useCallback((evt: React.PointerEvent<HTMLFormElement>) => {
					containerPressed = evt.target === formRef.current;
				}, [])
			}
			onPointerUp={
				useCallback((evt: React.PointerEvent<HTMLFormElement>) => {
					if (containerPressed && evt.target === formRef.current) {
						// The user both pressed and released their pointer on the dialog, so resolve the dialog with `undefined`.
						dialog.resolve();
					}
					containerPressed = false;
				}, [dialog])
			}
		>
			<dialog open>
				<h2 className="dialog-title">
					{dialog.title}
				</h2>
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