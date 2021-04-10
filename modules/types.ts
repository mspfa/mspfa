// This file is for general types that don't really fit under a single scope.

export type RecursivePartial<Type> = Partial<{
	[Key in keyof Type]?: (
		// I would use `extends Record<string, any>` and invert the condition, except for some reason the JSON schema generator thinks primitive types extend objects.
		Type[Key] extends string | number | boolean | undefined | null
			? Type[Key]
			: RecursivePartial<Type[Key]>
	)
}>;

/** @pattern ^https?:// */
export type URLString = string;

/**
 * The following regular expression is copied directly from https://html.spec.whatwg.org/multipage/input.html#valid-e-mail-address.
 * @pattern ^[a-zA-Z0-9.!#$%&'*+\/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$
 */
export type EmailString = string;

export type Method = 'get' | 'delete' | 'head' | 'options' | 'post' | 'put' | 'patch';

/** The methods for which axios has a `data` parameter. */
export type MethodWithData = 'post' | 'put' | 'patch';