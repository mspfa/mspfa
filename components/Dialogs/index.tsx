import { useDialogs } from 'lib/client/Dialog';
import DialogContainer from 'components/Dialogs/DialogContainer';
import { useEffect } from 'react';

/**
 * The component which renders the dialog stack.
 *
 * ⚠️ This should never be rendered anywhere but in the `Page` component's direct children.
 */
const Dialogs = () => {
	const dialogs = useDialogs();

	useEffect(() => {
		const onKeyDown = (event: KeyboardEvent) => {
			if (event.code === 'Escape') {
				const topDialog = dialogs.length && dialogs[dialogs.length - 1];
				if (topDialog) {
					topDialog.resolve();
				}
			}
		};

		document.addEventListener('keydown', onKeyDown);

		return () => {
			document.removeEventListener('keydown', onKeyDown);
		};
	}, [dialogs]);

	return (
		<div id="dialogs">
			{dialogs.map(dialog => (
				<DialogContainer
					key={dialog.id}
					dialog={dialog}
				/>
			))}
		</div>
	);
};

export default Dialogs;