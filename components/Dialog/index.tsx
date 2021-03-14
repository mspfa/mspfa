import React from 'react';
import type { Dialog as DialogClass } from 'modules/dialogs';
import './styles.module.scss';

export type DialogProps = {
	dialog: DialogClass
};

const Dialog = React.memo(({ dialog }: DialogProps) => (
	<div className="dialog-container">
		<dialog className="dialog" open>
			<div className="dialog-title">
				{dialog.title}
			</div>
			<div className="dialog-content">
				{dialog.content}
			</div>
			{dialog.actions && (
				<div className="dialog-actions">
					{dialog.actions.map(action => (
						<>{action.label}</>
					))}
				</div>
			)}
		</dialog>
	</div>
));

export default Dialog;