import type { ObjectId } from 'mongodb';
import type { ServerUserID } from 'lib/server/users';

export type ServerCommentID = ObjectId;

export type ServerComment = {
	id: ServerCommentID,
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