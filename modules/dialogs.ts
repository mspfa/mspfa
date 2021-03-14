import createGlobalState from 'global-react-state';
import createUpdater from 'react-component-updater';

export type DialogActionData = {
	label: string,
	autofocus?: boolean
};

export type DialogData = {
	id: number | string,
	title: string,
	content: JSX.Element,
	actions?: DialogActionData[]
};

const dialogs: DialogData[] = [];
const [useDialogData] = createGlobalState(dialogs);
const [useDialogsUpdater, updateDialogs] = createUpdater();

export const useDialogs = () => {
	useDialogsUpdater();
	const [dialogs] = useDialogData();
	
	return dialogs;
};

export type DialogOptions = Omit<DialogData, 'id'>;
type DialogResult = string | undefined;

let resolvePromise: (value: DialogResult) => void;

export class Dialog extends Promise<DialogResult> implements DialogData {
	id = Math.random();
	title;
	content;
	actions;
	
	#resolvePromise!: typeof resolvePromise;
	
	/** Close the dialog and resolve its promise. */
	resolve(
		/** The result of the dialog's promise. */
		value?: DialogResult
	) {
		this.#resolvePromise(value);
		
		dialogs.splice(dialogs.findIndex(({ id }) => this.id === id), 1);
		updateDialogs();
	}
	
	constructor({ title, content, actions }: DialogOptions) {
		super(resolve => {
			resolvePromise = resolve;
		});
		
		this.#resolvePromise = resolvePromise;
		
		this.title = title;
		this.content = content;
		this.actions = actions;
		
		dialogs.push(this);
		updateDialogs();
	}
}