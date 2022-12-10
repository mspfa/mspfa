import type { DialogContainerElement } from 'components/Dialog/DialogContainer';
import Router from 'next/router';
import { useEffect } from 'react';
import type { Updater } from 'use-immer';
import { useImmer } from 'use-immer';

export const dialogsUpdater: {
	updateDialogs: Updater<DialogContainerElement[]>
} = {
	updateDialogs: undefined as never
};

/**
 * The component which renders the dialog stack.
 *
 * ⚠️ This should never be rendered anywhere but in the `Page` component.
 */
const Dialogs = () => {
	// This state is an array of dialogs in order from bottom to top.
	const [dialogs, updateDialogs] = useImmer<DialogContainerElement[]>([]);

	dialogsUpdater.updateDialogs = updateDialogs;

	// Remove dialogs without resolution on route change.
	useEffect(() => {
		const onRouteChangeStart = () => {
			updateDialogs([]);
		};

		Router.events.on('routeChangeStart', onRouteChangeStart);

		return () => {
			Router.events.off('routeChangeStart', onRouteChangeStart);
		};
	}, [updateDialogs]);

	// Close the top dialog when pressing `Escape`.
	useEffect(() => {
		if (dialogs.length === 0) {
			return;
		}

		const onKeyDown = (event: KeyboardEvent) => {
			if (event.code === 'Escape') {
				const topDialog = dialogs[dialogs.length - 1];
				topDialog.props.resolve({
					initialValues: null,
					values: null,
					submitted: false
				});
			}
		};

		document.addEventListener('keydown', onKeyDown);

		return () => {
			document.removeEventListener('keydown', onKeyDown);
		};
	}, [dialogs]);

	return (
		<div id="dialogs">
			{dialogs}
		</div>
	);
};

export default Dialogs;
