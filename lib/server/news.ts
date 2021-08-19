import type { ObjectId } from 'mongodb';
import type { ServerUserID } from 'lib/server/users';
import type { ClientNews } from 'lib/client/news';

export type ServerNewsID = ObjectId;

export type ServerNews = {
	id: ServerNewsID,
	posted: Date,
	edited?: Date,
	author: ServerUserID,
	/**
	 * @minLength 1
	 * @maxLength 20000
	 */
	content: string
};

/** Converts a `ServerNews` to a `ClientNews`. */
export const getClientNews = (serverNews: ServerNews): ClientNews => ({
	id: serverNews.id.toString(),
	posted: +serverNews.posted,
	...serverNews.edited !== undefined && {
		edited: +serverNews.edited
	},
	author: serverNews.author.toString(),
	content: serverNews.content
});