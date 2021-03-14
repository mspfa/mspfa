import React, { useCallback, useEffect, useRef } from 'react';
import type { Dialog as DialogClass } from 'modules/dialogs';
import './styles.module.scss';

export type DialogProps = {
	dialog: DialogClass
};

const Dialog = React.memo(({ dialog }: DialogProps) => {
	const formRef = useRef<HTMLFormElement>(null);
	
	useEffect(() => {
		dialog.form = formRef.current!;
		const autoFocused = dialog.form.querySelector('[autofocus]');
		if (autoFocused instanceof HTMLElement) {
			autoFocused.focus();
		}
	}, [dialog]);
	
	const handleSubmit = useCallback((evt: React.FormEvent<HTMLFormElement>) => {
		evt.preventDefault();
		dialog.resolve(dialog.submitAction);
	}, [dialog]);
	
	return (
		<form className="dialog-container" ref={formRef} onSubmit={handleSubmit}>
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