import type { ObjectId } from 'mongodb';
import type { ServerUserID } from 'lib/server/users';
import type { ClientNewsPost } from 'lib/client/news';

export type ServerNewsPostID = ObjectId;

export type ServerNewsPost = {
	id: ServerNewsPostID,
	posted: Date,
	edited?: Date,
	author: ServerUserID,
	/**
	 * @minLength 1
	 * @maxLength 20000
	 */
	content: string
};

/** Converts a `ServerNewsPost` to a `ClientNewsPost`. */
export const getClientNewsPost = (serverNews: ServerNewsPost): ClientNewsPost => ({
	id: serverNews.id.toString(),
	posted: +serverNews.posted,
	...serverNews.edited !== undefined && {
		edited: +serverNews.edited
	},
	author: serverNews.author.toString(),
	content: serverNews.content
});