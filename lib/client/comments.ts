import type { ServerComment } from 'lib/server/comments';
import type { StoryPageID } from 'lib/server/stories';
import type { ServerUser } from 'lib/server/users';
import type { DateNumber, integer } from 'lib/types';

/** All keys whose values have the same serializable type in both `ServerComment` and `ClientComment`. */
type ClientCommentKey = 'content';

/** A serializable version of `ServerComment` with only the properties that can safely be exposed to any client. */
export type ClientComment<
	User extends ServerUser | undefined = ServerUser | undefined
> = Pick<ServerComment, ClientCommentKey> & {
	id: string,
	pageID: StoryPageID,
	posted: DateNumber,
	edited?: DateNumber,
	author: string,
	likeCount: integer,
	dislikeCount: integer,
	replyCount: integer
} & (
	User extends ServerUser ? {
		/** `1` if the user liked the comment, `-1` if they disliked the comment, or `0` if they haven't rated the comment. Undefined if there is no user. */
		userRating: -1 | 0 | 1
	} : {
		/** `1` if the user liked the comment, `-1` if they disliked the comment, or `0` if they haven't rated the comment. Undefined if there is no user. */
		userRating?: undefined
	}
);

/** A serializable version of `ServerCommentReply` with only the properties that can safely be exposed to any client. */
export type ClientCommentReply<
	User extends ServerUser | undefined = ServerUser | undefined
> = Omit<ClientComment<User>, 'pageID' | 'replyCount'>;

/** A `ClientComment` or `ClientCommentReply`. */
export type ClientCommentOrReply = ClientComment | (
	ClientCommentReply & Partial<Record<Exclude<keyof ClientComment, keyof ClientCommentReply>, never>>
);