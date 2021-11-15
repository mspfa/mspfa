import createUpdater from 'react-component-updater';
import type { ReactNode, Key } from 'react';
import type { FormikProps } from 'formik';
import Router from 'next/router';
import type { integer } from 'lib/types';

/** The array of all dialogs. */
export const dialogs: Array<Dialog<any>> = [];
const [useDialogsUpdater, updateDialogs] = createUpdater();

/** A hook which keeps the component updated with `dialogs`. */
export const useDialogs = () => {
	useDialogsUpdater();
	return dialogs;
};

export type DialogActionOptions = {
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
	 * If no action has `autoFocus: true`, it will be set by default, either on the action with `submit: true` or on the first action.
	 */
	autoFocus?: boolean,
	/** This property does nothing by default and can be read from a resolved dialog's result. */
	value?: any
};

export type DialogAction = DialogActionOptions & {
	/** The index of the action in the dialog's `actions`. */
	index: integer,
	onClick: () => void
};

export type DialogOptions<Values extends Record<string, any> = any> = {
	/**
	 * The React array key for the dialog's component.
	 *
	 * If set, any other dialog with the same `id` will be resolved with `undefined` when this dialog is created.
	 *
	 * Be careful when setting the same `id` on multiple dialogs with different form values and/or contents.
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
	index?: integer,
	/** The title of the dialog. */
	title: Dialog<Values>['title'],
	/**
	 * The content of the dialog.
	 *
	 * If set to a function, it must return the content of the dialog, and it will be passed a parameter of the Formik props when called.
	 */
	content?: Dialog<Values>['content'],
	/** Initial field values for the dialog's form. Keys are field `name`s. */
	initialValues?: Dialog<Values>['initialValues'],
	/**
	 * The actions which the user can select to close the dialog.
	 *
	 * A `value` in this array (such as a string) which isn't valid `DialogActionOptions` is shorthand for `{ label: value }`.
	 */
	actions?: Array<DialogActionOptions['label'] | DialogActionOptions>
};

export type DialogResult = Partial<DialogAction> | undefined;

const _resolvePromise = Symbol('resolvePromise');
let resolvePromise: (value?: DialogResult) => void;

let nextDialogID = 0;

export default class Dialog<Values extends Record<string, any>> extends Promise<DialogResult> {
	static get [Symbol.species]() {
		// This is so `then`, `catch`, and `finally` return a `Promise` rather than a `Dialog`. Errors occur when this is not here.
		return Promise;
	}

	get [Symbol.toStringTag]() {
		return 'Dialog';
	}

	id: Key;
	title: ReactNode;
	content: ReactNode | ((props: FormikProps<Values>) => ReactNode);
	initialValues: Values;
	/** The dialog's `FormikProps`. */
	form: FormikProps<Values> | undefined;
	actions: DialogAction[];
	/** Whether the dialog has been resolved. */
	resolved = false;
	/** Whether the dialog's component is currently mounted. */
	open = false;
	/** The action with `submit: true`. */
	submitAction: DialogAction | undefined;

	[_resolvePromise]: typeof resolvePromise;

	constructor({
		id = nextDialogID++,
		index = -1,
		title,
		initialValues = {} as Values,
		content,
		actions: actionsOption = ['Okay']
	}: DialogOptions<Values>) {
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
			const action: DialogAction = Object.assign(
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
		value?: DialogResult,
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
	static confirm = async <Values extends Record<string, any>>(
		{
			actions = ['Yes', 'No'],
			...options
		}: DialogOptions<Values>
	) => !!(await new Dialog({ actions, ...options }))?.submit;

	static getByID = <Values extends Record<string, any>>(
		id: Dialog<Values>['id']
	): Dialog<Values> | undefined => dialogs.find(dialog => dialog.id === id);
}

Router.events.on('routeChangeStart', () => {
	// Remove dialogs without resolution on route change.
	dialogs.length = 0;

	updateDialogs();
});