import createGlobalState from 'global-react-state';
import createUpdater from 'react-component-updater';
import type { ReactNode } from 'react';

export type DialogActionOption = {
	/** The label of the action's button. */
	label: ReactNode,
	/**
	 * Whether the action should be auto-focused when the dialog opens.
	 * 
	 * If none of the dialog's actions have `focus: true`, it will be set on the action with `submit: true`. If no action has `submit: true`, it will be set on the last action.
	 * 
	 * This will be ignored if an element in the dialog's content has `autoFocus="true"`.
	 */
	focus?: boolean,
	/**
	 * Whether submitting the dialog form (e.g. by pressing `enter` with a form field focused) will trigger the action.
	 * 
	 * If no action has `submit: true`, it will be set on the last action.
	 */
	submit?: boolean
};

export const onClick = Symbol('onClick');
export type DialogAction = DialogActionOption & {
	/** The index of the action in the dialog's `actions`. */
	index: number,
	[onClick]: () => void
};

/** The array of all dialogs. */
export const dialogs: Dialog[] = [];
const [useDialogsUpdater, updateDialogs] = createUpdater();

/** A hook which keeps the component updated with `dialogs`. */
export const useDialogs = () => {
	useDialogsUpdater();
	return dialogs;
};

export type DialogOptions = {
	/** The title of the dialog. */
	title: Dialog['title'],
	/**
	 * The content of the dialog.
	 * 
	 * Any content element with `autoFocus="true"` will be auto-focused when the dialog opens.
	 */
	content: Dialog['content'],
	/** The actions which the user can select to close the dialog. */
	actions?: DialogActionOption[]
};

type DialogResult = DialogAction | undefined;
let resolvePromise: (value: DialogResult) => void;

export class Dialog extends Promise<DialogResult> {
	readonly [Symbol.toStringTag] = 'Dialog';
	// This is so `then`, `catch`, etc. return a `Promise` rather than a `Dialog`. Weird errors occur when this is not here.
	static readonly [Symbol.species] = Promise;
	
	/** The React array key for this dialog's component. */
	readonly id = Math.random();
	title: ReactNode;
	content: ReactNode;
	actions: DialogAction[];
	form?: HTMLFormElement;
	submitAction?: DialogAction;
	
	#resolvePromise: typeof resolvePromise;
	
	/** Close the dialog and resolve its promise. */
	resolve(
		/** The result of the dialog's promise. */
		value?: DialogResult
	) {
		this.#resolvePromise(value);
		
		dialogs.splice(dialogs.findIndex(({ id }) => this.id === id), 1);
		updateDialogs();
	}
	
	constructor({ title, content, actions: actionsOption }: DialogOptions) {
		super(resolve => {
			// `this.#resolvePromise` cannot be set here directly, because then a class property would be set before `super` is called, which throws an error.
			resolvePromise = resolve;
		});
		
		this.#resolvePromise = resolvePromise;
		
		this.title = title;
		this.content = content;
		this.actions = actionsOption ? actionsOption.map((actionOption, index) => {
			const action: DialogAction = {
				...actionOption,
				index,
				[onClick]: () => {
					this.resolve(action);
				}
			};
			
			if (action.submit) {
				if (this.submitAction) {
					// Ensure there is at most one action with `submit: true`.
					action.submit = false;
				} else {
					// Set `this.submitAction` to the first action with `submit: true`.
					this.submitAction = action;
				}
			}
			
			return action;
		}) : [];
		
		if (this.actions.length) {
			// If no action has `submit: true`, set it on the last action.
			if (!this.submitAction) {
				this.submitAction = this.actions[this.actions.length - 1];
				this.submitAction.submit = true;
			}
			
			// If no action has `focus: true`, set it on the action with `submit: true`.
			if (!this.actions.some(action => action.focus)) {
				this.submitAction.focus = true;
			}
		}
		
		// This renders the dialog component in `components/Dialog/index.tsx`.
		dialogs.push(this);
		updateDialogs();
	}
	
	static Actions: Record<string, DialogOptions['actions']> = {
		Okay: [
			{ label: 'Okay', focus: true, submit: true }
		],
		Confirm: [
			{ label: 'Cancel' },
			{ label: 'Okay', focus: true, submit: true }
		]
	};
}