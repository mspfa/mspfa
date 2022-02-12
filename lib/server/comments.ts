import type { ObjectId } from 'mongodb';
import type { ServerUser, ServerUserID } from 'lib/server/users';
import type { ClientComment, ClientCommentReply } from 'lib/client/comments';
import type { StoryPageID } from 'lib/server/stories';
import stringifyID from 'lib/server/db/stringifyID';

export type ServerCommentID = ObjectId;

export type ServerCommentReply = {
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

export type ServerComment = ServerCommentReply & {
	/** This comment's replies sorted from oldest to newest. */
	replies: ServerCommentReply[]
};

/** Converts a `ServerComment` to a `ClientComment`. */
export const getClientComment = <User extends ServerUser | undefined>(
	serverComment: ServerComment,
	/** The page ID which the comment is on. */
	pageID: StoryPageID,
	/** The user accessing this comment, or undefined if there is no authenticated user. */
	user: User
): ClientComment<User> => ({
	id: stringifyID(serverComment.id),
	pageID,
	posted: +serverComment.posted,
	...serverComment.edited !== undefined && {
		edited: +serverComment.edited
	},
	author: stringifyID(serverComment.author),
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
	),
	replyCount: serverComment.replies.length
});

/** Converts a `ServerCommentReply` to a `ClientCommentReply`. */
export const getClientCommentReply = <User extends ServerUser | undefined>(
	serverCommentReply: ServerCommentReply,
	/** The user accessing this comment, or undefined if there is no authenticated user. */
	user: User
): ClientCommentReply<User> => ({
	id: stringifyID(serverCommentReply.id),
	posted: +serverCommentReply.posted,
	...serverCommentReply.edited !== undefined && {
		edited: +serverCommentReply.edited
	},
	author: stringifyID(serverCommentReply.author),
	content: serverCommentReply.content,
	likeCount: serverCommentReply.likes.length,
	dislikeCount: serverCommentReply.dislikes.length,
	...user && {
		userRating: (
			serverCommentReply.likes.some(userID => userID.equals(user._id))
				? 1
				: serverCommentReply.dislikes.some(userID => userID.equals(user._id))
					? -1
					: 0
		)
	} as any
});