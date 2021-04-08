import { useDialogs } from 'modules/client/dialogs';
import Dialog from 'components/Dialog';

/**
 * The component which renders the dialog stack.
 *
 * ⚠️ This should never be rendered anywhere but in the `Page` component's direct children.
 */
const Dialogs = () => {
	const dialogs = useDialogs();

	return (
		<div id="dialogs">
			{dialogs.map(dialog => <Dialog key={dialog.id} dialog={dialog} />)}
		</div>
	);
};

export default Dialogs;