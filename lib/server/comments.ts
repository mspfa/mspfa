import type { ObjectId } from 'mongodb';
import type { ServerUserID } from 'lib/server/users';
import type { ClientComment } from 'lib/client/comments';
import type { StoryPageID } from 'lib/server/stories';

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

/** Converts a `ServerComment` to a `ClientComment`. */
export const getClientComment = (
	serverComment: ServerComment,
	/** The page ID which the comment is on. */
	pageID: StoryPageID
): ClientComment => ({
	id: serverComment.id.toString(),
	pageID,
	posted: +serverComment.posted,
	...serverComment.edited !== undefined && {
		edited: +serverComment.edited
	},
	author: serverComment.author.toString(),
	content: serverComment.content,
	likeCount: serverComment.likes.length,
	dislikeCount: serverComment.dislikes.length
});