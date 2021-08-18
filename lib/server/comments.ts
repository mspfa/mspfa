import type { ServerUserID } from 'lib/server/users';

export type ServerComment = {
	posted: Date,
	edited?: Date,
	author: ServerUserID,
	/**
	 * @minLength 1
	 * @maxLength 2000
	 */
	content: string,
	/** @uniqueItems true */
	likes: ServerUserID[],
	/** @uniqueItems true */
	dislikes: ServerUserID[]
};