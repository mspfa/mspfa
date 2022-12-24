import Router from 'next/router';
import { useEffect } from 'react';
import type { Updater } from 'use-immer';
import { useImmer } from 'use-immer';

export const dialogElementsUpdater: Readonly<{
	updateDialogElements: Updater<JSX.Element[]>
}> = {
	updateDialogElements: undefined as never
};

/**
 * The component which renders the dialog stack.
 *
 * ⚠️ This should never be rendered anywhere but in the `Page` component.
 */
const Dialogs = () => {
	// This state is the array of dialog elements in order from bottom to top.
	const [dialogElements, updateDialogElements] = useImmer<JSX.Element[]>([]);

	Object.assign(dialogElementsUpdater, { updateDialogElements });

	// Remove dialogs without resolution on route change.
	useEffect(() => {
		const onRouteChangeStart = () => {
			updateDialogElements([]);
		};

		Router.events.on('routeChangeStart', onRouteChangeStart);

		return () => {
			Router.events.off('routeChangeStart', onRouteChangeStart);
		};
	}, [updateDialogElements]);

	// Close the top dialog when pressing `Escape`.
	/* TODO
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
	*/

	return (
		<div id="dialogs">
			{dialogElements}
		</div>
	);
};

export default Dialogs;
