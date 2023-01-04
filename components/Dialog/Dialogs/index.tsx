import './styles.module.scss';
import type { DialogManager } from 'components/Dialog';
import Router from 'next/router';
import { useEffect } from 'react';
import type { ImmerHook } from 'use-immer';
import { useImmer } from 'use-immer';

/** The current value of the state hook (using Immer) for the array of dialogs in order from bottom to top. */
export let dialogsState: ImmerHook<ReadonlyArray<DialogManager<any, any>>>;

/**
 * The component that renders all dialogs.
 *
 * ⚠️ This should never be used anywhere but in the `Page` component.
 */
const Dialogs = () => {
	dialogsState = useImmer<ReadonlyArray<DialogManager<any, any>>>([]);
	const [dialogs] = dialogsState;

	// Remove dialogs without resolution on route change.
	useEffect(() => {
		const onRouteChangeStart = () => {
			for (const dialog of dialogs) {
				dialog.remove();
			}
		};

		Router.events.on('routeChangeStart', onRouteChangeStart);

		return () => {
			Router.events.off('routeChangeStart', onRouteChangeStart);
		};
	}, [dialogs]);

	// Close the top dialog when pressing `Escape`.
	useEffect(() => {
		if (dialogs.length === 0) {
			return;
		}

		const onKeyDown = (event: KeyboardEvent) => {
			if (event.code === 'Escape') {
				const topDialog = dialogs[dialogs.length - 1];
				topDialog.cancel();
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
