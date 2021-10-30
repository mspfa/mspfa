import createUpdater from 'react-component-updater';
import Router from 'next/router';

/** The array of all dialogs. */
export const dialogs = [];
const [useDialogsUpdater, updateDialogs] = createUpdater();

/** A hook which keeps the component updated with `dialogs`. */
export const useDialogs = () => {
	useDialogsUpdater();
	return dialogs;
};

const _resolvePromise = Symbol('resolvePromise');
let resolvePromise;

let nextDialogID = 0;

export default class Dialog extends Promise {
	// This is so `then`, `catch`, etc. return a `Promise` rather than a `Dialog`. Weird errors occur when this is not here.
	static [Symbol.species] = Promise;

	[Symbol.toStringTag] = 'Dialog';

	id;
	title;
	content;
	initialValues;
	/** The dialog's `FormikProps`. */
	form;
	actions;
	/** Whether the dialog has been resolved. */
	resolved = false;
	/** Whether the dialog's component is currently mounted. */
	open = false;
	/** The action with `submit: true`. */
	submitAction;

	[_resolvePromise];

	constructor({
		id = nextDialogID++,
		index = -1,
		title,
		initialValues = {},
		content,
		actions: actionsOption = ['Okay']
	}) {
		super(resolve => {
			// `this[_resolvePromise]` cannot be set here directly, because then a class property would be set before `super` is called, which throws an error.
			resolvePromise = resolve;
		});
		this[_resolvePromise] = resolvePromise;

		this.id = id;
		this.title = title;
		this.initialValues = initialValues;
		this.content = content;
		this.actions = actionsOption.map((actionOption, i) => {
			const action = Object.assign(
				actionOption instanceof Object && 'label' in actionOption
					? { ...actionOption }
					: { label: actionOption },
				{
					index: i,
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

			// If no action has `autoFocus: true`...
			if (!this.actions.some(action => action.autoFocus)) {
				if (this.submitAction) {
					// ...set `autoFocus: true` on the action with `submit: true` (unless it explicitly sets `autoFocus` already)...
					if (!('autoFocus' in this.submitAction)) {
						this.submitAction.autoFocus = true;
					}
				} else if (!('autoFocus' in this.actions[0])) {
					// ...or, if there is no action with `submit: true`, set `autoFocus: true` on the first action (unless it explicitly sets `autoFocus` already).
					this.actions[0].autoFocus = true;
				}
			}
		}

		// Remove any other dialog with the same `id`.
		Dialog.getByID(this.id)?.resolve(undefined, false);

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

	/** Closes the dialog and resolves its promise. */
	resolve = (
		/** The result of the dialog's promise. */
		value,
		/** Whether dialogs should be re-rendered upon completion. */
		shouldUpdateDialogs = true
	) => {
		this[_resolvePromise](value);
		this.resolved = true;

		for (let i = 0; i < dialogs.length; i++) {
			const dialog = dialogs[i];

			if (dialog === this) {
				// Remove this dialog from the array.
				dialogs.splice(i--, 1);

				if (shouldUpdateDialogs) {
					updateDialogs();
				}

				break;
			}
		}

		return this;
	};

	/**
	 * `Dialog.confirm` is equivalent to `new Dialog`, except:
	 *
	 * * Instead of returning a `Dialog` instance, it resolves after the dialog closes with a boolean for whether its `submit` property is `true`.
	 * * Its default `actions` option is `['Yes', 'No']`.
	 */
	static confirm = async (
		{
			actions = ['Yes', 'No'],
			...options
		}
	) => !!(await new Dialog({ actions, ...options }))?.submit;

	static getByID = (
		id
	) => dialogs.find(dialog => dialog.id === id);
}

Router.events.on('routeChangeStart', () => {
	// Remove dialogs without resolution on route change.
	dialogs.length = 0;

	updateDialogs();
});