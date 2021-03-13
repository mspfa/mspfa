import createGlobalState from 'global-react-state';
import type { DialogData } from 'modules/dialogs';
import dynamic from 'next/dynamic';

export const [useDialogs, setDialogs] = createGlobalState<DialogData[]>([]);

const Dialog = dynamic(() => import('.'));

const Dialogs = () => {
	const [dialogs] = useDialogs();
	
	return (
		<div id="dialogs">
			{dialogs.map(dialog => (
				<Dialog
					key={dialog.id}
					id={dialog.id}
					title={dialog.title}
					actions={dialog.actions}
				>
					{dialog.content}
				</Dialog>
			))}
		</div>
	);
};

export default Dialogs;