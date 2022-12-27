import Dialog from 'components/Dialog';
import { useEffect } from 'react';

/** Displays an error dialog when an uncaught error occurs anywhere. */
const useGlobalUncaughtErrorDialogs = () => {
	useEffect(() => {
		const onError = (event: ErrorEvent) => {
			if (event.filename.startsWith(`${location.origin}/`)) {
				Dialog.create(
					<Dialog title="Bug Found!">
						<div className="red">
							{event.message}
						</div>
						<br />
						<div className="translucent">
							{event.error.stack || (
								`${event.error.message}\n    at ${event.filename}:${event.lineno}${event.colno ? `:${event.colno}` : ''}`
							)}
						</div>
					</Dialog>
				);
			}
		};

		window.addEventListener('error', onError);

		return () => {
			window.removeEventListener('error', onError);
		};
	}, []);
};

export default useGlobalUncaughtErrorDialogs;
