import createGlobalState from 'global-react-state';

export type DialogActionData = {
	label: string,
	autofocus?: boolean
};

export type DialogData = {
	id: number | string,
	title: string,
	content: JSX.Element,
	actions: DialogActionData[]
};

export const [useDialogs, setDialogs] = createGlobalState<DialogData[]>([]);

export type DialogOptions = Omit<DialogData, 'id'>;

export class Dialog extends Promise<string> {
	private resolve?: (value: string | PromiseLike<string>) => void;
	
	constructor(options: DialogOptions) {
		super(resolve => {
			this.resolve = resolve;
		});
	}
}