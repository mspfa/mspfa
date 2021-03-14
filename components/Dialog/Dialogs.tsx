import { useDialogs } from 'modules/dialogs';
import dynamic from 'next/dynamic';

const Dialog = dynamic(() => import('.'));

const Dialogs = () => {
	const dialogs = useDialogs();
	
	return (
		<div id="dialogs">
			{dialogs.map(dialog => <Dialog key={dialog.id} dialog={dialog} />)}
		</div>
	);
};

export default Dialogs;