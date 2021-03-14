import { useDialogs } from 'modules/dialogs';
import dynamic from 'next/dynamic';

const Dialog = dynamic(() => import('.'));

const Dialogs = () => {
	const dialogs = useDialogs();
	
	return (
		<div id="dialogs">
			{dialogs.map(dialogData => <Dialog key={dialogData.id} {...dialogData} />)}
		</div>
	);
};

export default Dialogs;