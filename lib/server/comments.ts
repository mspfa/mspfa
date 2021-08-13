import type { ServerUserID } from 'lib/server/users';

export type Comment = {
	posted: Date,
	edited?: Date,
	author: ServerUserID,
	/** @minLength 1 */
	content: string,
	/** @uniqueItems true */
	likes: ServerUserID[],
	/** @uniqueItems true */
	dislikes: ServerUserID[]
};