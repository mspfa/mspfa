// This file is for general types that don't really fit under another particular module.

import type { ObjectId } from 'mongodb';

export type RecursivePartial<Type> = Partial<{
	[Key in keyof Type]?: (
		Type[Key] extends string | number | boolean | symbol | undefined | null | any[] | Date | ObjectId
			? Type[Key]
			: RecursivePartial<Type[Key]>
	)
}>;

/** Makes a read-only type not read-only. */
export type Mutable<Type> = {
	-readonly [Key in keyof Type]: Type[Key]
};

// The purpose of this is to add clarity to whether a given number is an integer or not. Additionally, using this type in an API schema allows integer validation. Please always use this type instead of `number` when applicable.
/** @asType integer */
export type integer = number;

// Outside of this range, `Date`s are invalid.
/**
 * @minimum -8640000000000000
 * @maximum 8640000000000000
 */
export type DateNumber = integer;

/** @pattern ^https?:// */
export type URLString = string;

// The following regular expression is copied directly from https://html.spec.whatwg.org/multipage/input.html#valid-e-mail-address.
/** @pattern ^[a-zA-Z0-9.!#$%&'*+\/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$ */
export type EmailString = string;

export type Method = 'get' | 'delete' | 'head' | 'options' | 'post' | 'put' | 'patch';

/** The methods for which axios has a `data` parameter. */
export type MethodWithData = 'post' | 'put' | 'patch';