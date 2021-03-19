import React, { useCallback, useEffect, useRef } from 'react';
import type { Dialog as DialogClass } from 'modules/dialogs';
import './styles.module.scss';

export type DialogProps = {
	dialog: DialogClass
};

const Dialog = React.memo(({ dialog }: DialogProps) => {
	const formRef = useRef<HTMLFormElement>(null);
	
	useEffect(() => {
		dialog.open = true;
		dialog.form = formRef.current!;
		
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
					dialog.submitAction?.onClick();
				}, [dialog.submitAction])
			}
		>
			<dialog id={`dialog-${dialog.id}`} open>
				<h2 className="dialog-title">
					{dialog.title}
				</h2>
				<div className="dialog-content">
					{dialog.content}
				</div>
				{!!dialog.actions.length && (
					<div className="dialog-actions">
						{dialog.actions.map((action, index) => (
							<button
								key={index}
								type={action.submit ? 'submit' : 'button'}
								className="dialog-action"
								autoFocus={action.focus}
								onClick={action.submit ? undefined : action.onClick}
							>
								{action.label}
							</button>
						))}
					</div>
				)}
			</dialog>
		</form>
	);
});

export default Dialog;