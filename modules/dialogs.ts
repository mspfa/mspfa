import createUpdater from 'react-component-updater';
import type { ReactNode, Key } from 'react';

/** The array of all dialogs. */
export const dialogs: Dialog[] = [];
const [useDialogsUpdater, updateDialogs] = createUpdater();

/** A hook which keeps the component updated with `dialogs`. */
export const useDialogs = () => {
	useDialogsUpdater();
	return dialogs;
};

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

export type DialogAction = DialogActionOption & {
	/** The index of the action in the dialog's `actions`. */
	index: number,
	onClick: () => void
};

export type DialogOptions = {
	/**
	 * The React array key for the dialog's component.
	 * 
	 * If set, any other dialog with the same `id` will be resolved with `undefined` when this dialog is created.
	 */
	id?: Key,
	/** A dialog which, when closed, should forcibly close this dialog and resolve it with `undefined`. */
	parent?: Dialog,
	/** The title of the dialog. */
	title: Dialog['title'],
	/**
	 * The content of the dialog.
	 * 
	 * Any content element with `autoFocus="true"` will be auto-focused when the dialog opens.
	 */
	content: Dialog['content'],
	/**
	 * The actions which the user can select to close the dialog.
	 * 
	 * A `value` in this array (such as a string) which isn't a valid `DialogActionOption` is shorthand for `{ label: value }`.
	 */
	actions?: Array<DialogActionOption['label'] | DialogActionOption>
};

type DialogResult = DialogAction | undefined;
let resolvePromise: (value?: DialogResult) => void;

export class Dialog extends Promise<DialogResult> {
	readonly [Symbol.toStringTag] = 'Dialog';
	// This is so `then`, `catch`, etc. return a `Promise` rather than a `Dialog`. Weird errors occur when this is not here.
	static readonly [Symbol.species] = Promise;
	
	id: Key;
	parent?: Dialog;
	title: ReactNode;
	content: ReactNode;
	actions: DialogAction[];
	/** The form element wrapping this dialog. */
	form?: HTMLFormElement;
	/** Whether the dialog has been resolved. */
	resolved = false;
	/** Whether the dialog's component is currently mounted. */
	open = false;
	
	#resolvePromise: typeof resolvePromise;
	
	/** Closes the dialog and resolves its promise. */
	resolve(
		/** The result of the dialog's promise. */
		value?: DialogResult,
		/** Whether dialogs should be re-rendered upon completion. */
		shouldUpdateDialogs = true
	) {
		this.#resolvePromise(value);
		this.resolved = true;
		for (let i = 0; i < dialogs.length; i++) {
			const dialog = dialogs[i];
			if (dialog === this) {
				// Remove this dialog from the array.
				dialogs.splice(i--, 1);
				if (shouldUpdateDialogs) {
					updateDialogs();
				}
			} else if (dialog.parent === this) {
				// Resolve `dialog` with `undefined` if it needs to close because of its parent (`this`) closing.
				dialog.resolve(undefined, shouldUpdateDialogs);
			}
		}
	}
	
	constructor({ id = String(Math.random()).slice(2), parent, title, content, actions: actionsOption }: DialogOptions) {
		super(resolve => {
			// `this.#resolvePromise` cannot be set here directly, because then a class property would be set before `super` is called, which throws an error.
			resolvePromise = resolve;
		});
		this.#resolvePromise = resolvePromise;
		
		/** The action with `submit: true`. */
		let submitAction: DialogAction | undefined;
		
		this.id = id;
		this.parent = parent;
		this.title = title;
		this.content = content;
		this.actions = actionsOption ? actionsOption.map((actionOption, index) => {
			const action: DialogAction = Object.assign(
				actionOption instanceof Object && 'label' in actionOption
					? { ...actionOption }
					: { label: actionOption },
				{
					index,
					onClick: () => {
						this.resolve(action);
					}
				}
			) as any;
			
			if (action.submit) {
				if (submitAction) {
					// Ensure there is at most one action with `submit: true`.
					delete action.submit;
				} else {
					// Set `submitAction` to the first action with `submit: true`.
					submitAction = action;
				}
			}
			
			return action;
		}) : [];
		
		if (this.actions.length) {
			// If no action has `submit: true`, set it on the first action.
			if (!submitAction) {
				submitAction = this.actions[0];
				submitAction.submit = true;
			}
			
			// If no action has `focus: true`, set it on the action with `submit: true`.
			if (!this.actions.some(action => action.focus)) {
				submitAction.focus = true;
			}
		}
		
		// Remove any other dialog with the same `id`.
		const duplicateDialog = dialogs.find(dialog => dialog.id === this.id);
		if (duplicateDialog) {
			duplicateDialog.resolve(undefined, false);
		}
		
		// Render the dialog's component.
		dialogs.push(this);
		updateDialogs();
	}
	
	/** Some presets you can plug into the `actions` option of the `Dialog` constructor. */
	static Actions = {
		Okay: ['Okay'],
		Cancel: ['Cancel'],
		Confirm: ['Okay', 'Cancel']
	};
}

if (process.browser) {
	document.addEventListener('keydown', evt => {
		if (evt.key.startsWith('Esc')) { // Should be `Escape`, but can be `Esc` on old browsers.
			// Resolve the last dialog with `undefined`.
			const topDialog = dialogs.length && dialogs[dialogs.length - 1];
			if (topDialog) {
				topDialog.resolve();
			}
		}
	});
}