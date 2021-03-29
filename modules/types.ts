// This file is for general types that don't really fit under a single scope.

import type { ObjectId } from 'bson';

/** @pattern ^https?:// */
export type URLString = string;

export type ItemType<Type extends readonly any[]> = Type extends ReadonlyArray<infer Item> ? Item : never;

export type Serializable<Type, TypeKey = keyof Type> = (
	Type extends undefined | string | number | boolean | null
		? Type
		: Type extends (...args: any) => any
			? never
			: Type extends Date
				? number
				: Type extends ObjectId
					? string
					: Type extends ReadonlyArray<infer Item>
						? Array<Serializable<Item>>
						: Type extends Record<any, any>
							? {
								-readonly [Key in (
									TypeKey extends string | number
										? Type[TypeKey] extends ({} | null)
											? TypeKey
											: never
										: never
								)]: Serializable<Type[Key]>
							} & {
								-readonly [Key in (
									TypeKey extends string | number
										? undefined extends Type[TypeKey]
											? TypeKey
											: never
										: never
								)]?: Serializable<Type[Key]>
							}
							: never
);

export type Method = 'get' | 'delete' | 'head' | 'options' | 'post' | 'put' | 'patch';

/** The methods for which axios has a `data` parameter. */
export type MethodWithData = 'post' | 'put' | 'patch';