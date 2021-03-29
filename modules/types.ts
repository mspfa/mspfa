// This file is for general types that don't really fit under a single scope.

/** @pattern ^https?:// */
export type URLString = string;

export type Method = 'get' | 'delete' | 'head' | 'options' | 'post' | 'put' | 'patch';

/** The methods for which axios has a `data` parameter. */
export type MethodWithData = 'post' | 'put' | 'patch';