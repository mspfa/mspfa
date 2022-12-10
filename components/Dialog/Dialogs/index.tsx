import { useEffect } from 'react';

/**
 * The component which renders the dialog stack.
 *
 * ⚠️ This should never be rendered anywhere but in the `Page` component.
 */
const Dialogs = () => {

	useEffect(() => {
		const onKeyDown = (event: KeyboardEvent) => {
			if (event.code === 'Escape') {
				if (topDialog) {
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
					dialog={dialog}
				/>
			))}
		</div>
	);
};

export default Dialogs;
