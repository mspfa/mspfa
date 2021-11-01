import type { ReactNode, Key } from 'react';
import type { FormikProps } from 'formik';
import type { integer } from 'lib/types';
/** The array of all dialogs. */
export declare const dialogs: Array<Dialog<any>>;
/** A hook which keeps the component updated with `dialogs`. */
export declare const useDialogs: () => Array<Dialog<any>>;
export declare type DialogActionOptions = {
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
export declare type DialogAction = DialogActionOptions & {
	/** The index of the action in the dialog's `actions`. */
	index: integer,
	onClick: () => void
};
export declare type DialogOptions<Values extends Record<string, any> = any> = {
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
export declare type DialogResult = Partial<DialogAction> | undefined;
declare const _resolvePromise: unique symbol;
declare let resolvePromise: (value?: DialogResult) => void;
export default class Dialog<Values extends Record<string, any>> extends Promise<DialogResult> {
	static readonly [Symbol.species]: PromiseConstructor;
	readonly [Symbol.toStringTag] = 'Dialog';
	id: Key;
	title: ReactNode;
	content: ReactNode | ((props: FormikProps<Values>) => ReactNode);
	initialValues: Values;
	/** The dialog's `FormikProps`. */
	form: FormikProps<Values> | undefined;
	actions: DialogAction[];
	/** Whether the dialog has been resolved. */
	resolved: boolean;
	/** Whether the dialog's component is currently mounted. */
	open: boolean;
	/** The action with `submit: true`. */
	submitAction: DialogAction | undefined;
	[_resolvePromise]: typeof resolvePromise;
	constructor({ id, index, title, initialValues, content, actions: actionsOption }: DialogOptions<Values>);
	/** Closes the dialog and resolves its promise. */
	resolve: (value?: DialogResult, shouldUpdateDialogs?: boolean) => this;
	/**
	 * `Dialog.confirm` is equivalent to `new Dialog`, except:
	 *
	 * * Instead of returning a `Dialog` instance, it resolves after the dialog closes with a boolean for whether its `submit` property is `true`.
	 * * Its default `actions` option is `['Yes', 'No']`.
	 */
	static confirm: <Values_1 extends Record<string, any>>({ actions, ...options }: DialogOptions<Values_1>) => Promise<boolean>;
	static getByID: <Values_1 extends Record<string, any>>(id: Key) => Dialog<Values_1> | undefined;
}
export {};