// This script is executed once initially on the client.

import * as MSPFA from 'modules/client/MSPFA';
import { Dialog } from 'modules/client/dialogs';
import env from 'modules/client/env';

(global as any).MSPFA = MSPFA;

window.addEventListener('error', event => {
	if (env.NODE_ENV === 'development' || /bot/i.test(navigator.userAgent)) {
		// return;
	}

	if (event.filename.startsWith(`${location.origin}/`)) {
		new Dialog({
			title: 'Uncaught Error',
			content: (
				<>
					<div className="error">
						{event.message}
					</div>
					<br />
					<div className="translucent-text">
						{event.error.stack || (
							`${event.error.message}\n    at ${event.filename}:${event.lineno}${event.colno ? `:${event.colno}` : ''}`
						)}
					</div>
				</>
			)
		});
	}
});