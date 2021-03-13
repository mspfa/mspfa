import React from 'react';
import type { DialogData } from 'modules/dialogs';
import './styles.module.scss';

export type DialogProps = DialogData;

const Dialog = React.memo(({ title, actions, content }: DialogProps) => (
	<div className="dialog-container">
		<dialog className="dialog" open>
			<div className="dialog-title">
				{title}
			</div>
			<div className="dialog-content">
				{content}
			</div>
			<div className="dialog-actions">
				{actions.map(action => (
					<>{action.label}</>
				))}
			</div>
		</dialog>
	</div>
), (prevProps, nextProps) => prevProps.id === nextProps.id);

export default Dialog;