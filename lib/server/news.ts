import type { ObjectId } from 'mongodb';
import type { ServerUserID } from 'lib/server/users';
import type { ClientNewsPost } from 'lib/client/news';
import stringifyID from 'lib/server/db/stringifyID';

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
	id: stringifyID(serverNews.id),
	posted: +serverNews.posted,
	...serverNews.edited !== undefined && {
		edited: +serverNews.edited
	},
	author: stringifyID(serverNews.author),
	content: serverNews.content
});