// This file is for general types that don't really fit under a single scope.

import type { ObjectId } from 'mongodb';

export type RecursivePartial<Type> = Partial<{
	[Key in keyof Type]?: (
		Type[Key] extends string | number | boolean | undefined | null | Date | ObjectId
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