import { useDialogs } from 'modules/client/dialogs';
import Dialog from 'components/Dialog';

const Dialogs = () => {
	const dialogs = useDialogs();
	
	return (
		<div id="dialogs">
			{dialogs.map(dialog => <Dialog key={dialog.id} dialog={dialog} />)}
		</div>
	);
};

export default Dialogs;