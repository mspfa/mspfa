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
	 * Whether submitting the dialog form (e.g. by pressing `enter` with a form field focused) will trigger the action.
	 * 
	 * If no action has `submit: true`, it will be set on the first action.
	 */
	submit?: boolean,
	/**
	 * Whether the action should be auto-focused when the dialog opens.
	 * 
	 * If no action has `focus: true`, it will be set by default, either on the action with `submit: true` or on the first action.
	 */
	focus?: boolean,
	/** Do whatever you want with this property. It does nothing by default. */
	value?: any
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
	/**
	 * The index at which this dialog should be inserted into the dialog stack. Negative numbers count from the top of the stack.
	 * 
	 * Examples:
	 * - `-1` (default) puts the dialog on top.
	 * - `-2` puts the dialog below the top one.
	 * - `1` puts the dialog above the bottom one.
	 * - `0` puts the dialog on the bottom.
	 */
	index?: number,
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

export type DialogResult = Partial<DialogAction> | undefined;
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
	/** The form element wrapping this dialog. Never undefined after the dialog's component is mounted. */
	form?: HTMLFormElement;
	/** Whether the dialog has been resolved. */
	resolved = false;
	/** Whether the dialog's component is currently mounted. */
	open = false;
	/** The action with `submit: true`. */
	submitAction: DialogAction | undefined;
	/** A function called when the dialog's component is mounted, called with an argument of the `Dialog` instance which was mounted. */
	onMount?: (dialog: Dialog) => void;
	
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
	
	constructor({
		id = Math.random().toString().slice(2),
		index = -1,
		parent,
		title,
		content,
		actions: actionsOption = ['Okay']
	}: DialogOptions) {
		super(resolve => {
			// `this.#resolvePromise` cannot be set here directly, because then a class property would be set before `super` is called, which throws an error.
			resolvePromise = resolve;
		});
		this.#resolvePromise = resolvePromise;
		
		this.id = id;
		this.parent = parent;
		this.title = title;
		this.content = content;
		this.actions = actionsOption.map((actionOption, index) => {
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
			);
			
			if (action.submit) {
				if (this.submitAction) {
					// Ensure there is at most one action with `submit: true`.
					delete action.submit;
				} else {
					// Set `this.submitAction` to the first action with `submit: true`.
					this.submitAction = action;
				}
			}
			
			return action;
		});
		
		if (this.actions.length) {
			// If no action has `submit: true`, set it on the first action (unless it explicitly sets `submit` already).
			if (
				!this.submitAction
				&& !('submit' in this.actions[0])
			) {
				this.submitAction = this.actions[0];
				this.submitAction.submit = true;
			}
			
			// If no action has `focus: true`...
			if (!this.actions.some(action => action.focus)) {
				if (this.submitAction) {
					// ...set `focus: true` on the action with `submit: true` (unless it explicitly sets `focus` already)...
					if (!('focus' in this.submitAction)) {
						this.submitAction.focus = true;
					}
				} else if (!('focus' in this.actions[0])) {
					// ...or, if there is no action with `submit: true`, set `focus: true` on the first action (unless it explicitly sets `focus` already).
					this.actions[0].focus = true;
				}
			}
		}
		
		// Remove any other dialog with the same `id`.
		const duplicateDialog = dialogs.find(dialog => dialog.id === this.id);
		if (duplicateDialog) {
			duplicateDialog.resolve(undefined, false);
		}
		
		// Render the dialog's component.
		if (index === -1) {
			dialogs.push(this);
		} else if (index === 0) {
			dialogs.unshift(this);
		} else {
			// Convert negative indexes relative to the end of the array into absolute indexes relative to the start of the array.
			if (index < 0) {
				index += dialogs.length;
			}
			
			// Limit `index` to the range [0, `dialogs.length - 1`].
			index = Math.min(Math.max(index, 0), dialogs.length - 1);
			
			// Insert `this` into `dialogs` at index `index`.
			dialogs.splice(index, 0, this);
		}
		updateDialogs();
	}
}

// @client-only {
document.addEventListener('keydown', evt => {
	// This check is necessary because of https://bugs.chromium.org/p/chromium/issues/detail?id=581537.
	if (evt.key) {
		if (
			// The escape key should set `evt.key` to `Escape`, but it can be `Esc` on old browsers.
			evt.key.startsWith('Esc')
		) {
			// Resolve the last dialog with `undefined`.
			const topDialog = dialogs.length && dialogs[dialogs.length - 1];
			if (topDialog) {
				topDialog.resolve();
			}
		}
	}
});
// @client-only }