import type { DialogManager } from 'components/Dialog';
import Router from 'next/router';
import { useEffect } from 'react';
import type { ImmerHook } from 'use-immer';
import { useImmer } from 'use-immer';

/** The current value of the state hook (using Immer) for the array of dialogs in order from bottom to top. */
export let dialogsState: ImmerHook<ReadonlyArray<DialogManager<any, any>>>;

/**
 * The component which renders the dialog stack.
 *
 * ⚠️ This should never be rendered anywhere but in the `Page` component.
 */
const Dialogs = () => {
	dialogsState = useImmer<ReadonlyArray<DialogManager<any, any>>>([]);
	const [dialogs, updateDialogs] = dialogsState;

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
				topDialog.close();
			}
		};

		document.addEventListener('keydown', onKeyDown);

		return () => {
			document.removeEventListener('keydown', onKeyDown);
		};
	}, [dialogs]);

	return (
		<div id="dialogs">
			{dialogs.map(dialog => dialog.element)}
		</div>
	);
};

export default Dialogs;
