import type { UserID } from 'modules/server/users';

export type Comment = {
	posted: Date,
	edited?: Date,
	author: UserID,
	/** @minLength 1 */
	content: string,
	/** @uniqueItems true */
	likes: UserID[],
	/** @uniqueItems true */
	dislikes: UserID[]
};