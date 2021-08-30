import type { ObjectId } from 'mongodb';
import type { ServerUser, ServerUserID } from 'lib/server/users';
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
export const getClientComment = <User extends ServerUser | undefined>(
	serverComment: ServerComment,
	/** The page ID which the comment is on. */
	pageID: StoryPageID,
	/** The user accessing this comment, or undefined if there is no authenticated user. */
	user: User
): ClientComment<User> => ({
	id: serverComment.id.toString(),
	pageID,
	posted: +serverComment.posted,
	...serverComment.edited !== undefined && {
		edited: +serverComment.edited
	},
	author: serverComment.author.toString(),
	content: serverComment.content,
	likeCount: serverComment.likes.length,
	dislikeCount: serverComment.dislikes.length,
	...user && {
		userRating: (
			serverComment.likes.some(userID => userID.equals(user._id))
				? 1
				: serverComment.dislikes.some(userID => userID.equals(user._id))
					? -1
					: 0
		)
	} as (
		User extends ServerUser ? {
			userRating: NonNullable<ClientComment['userRating']>
		} : never
	)
});