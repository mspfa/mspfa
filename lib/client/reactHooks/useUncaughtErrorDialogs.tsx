import Dialog from 'lib/client/Dialog';
import { useEffect } from 'react';

/**
 * Displays an error dialog when an uncaught error occurs anywhere.
 *
 * ⚠️ Should only ever be used once in the entire app.
 */
const useUncaughtErrorDialogs = () => {
	useEffect(() => {
		const onError = (event: ErrorEvent) => {
			if (event.filename.startsWith(`${location.origin}/`)) {
				new Dialog({
					title: 'Uncaught Error',
					content: (
						<>
							<div className="red">
								{event.message}
							</div>
							<br />
							<div className="translucent">
								{event.error.stack || (
									`${event.error.message}\n    at ${event.filename}:${event.lineno}${event.colno ? `:${event.colno}` : ''}`
								)}
							</div>
						</>
					)
				});
			}
		};

		window.addEventListener('error', onError);

		return () => {
			window.removeEventListener('error', onError);
		};
	}, []);
};

export default useUncaughtErrorDialogs;
