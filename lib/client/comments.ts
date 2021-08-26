import type { ServerComment } from 'lib/server/comments';
import type { DateNumber, integer } from 'lib/types';

/** All keys whose values have the same serializable type in both `ServerComment` and `ClientComment`. */
type ClientCommentKey = 'content';

/** A serializable version of `ServerComment` with only the properties that can safely be exposed to any client. */
export type ClientComment = Pick<ServerComment, ClientCommentKey> & {
	id: string,
	posted: DateNumber,
	edited?: DateNumber,
	author: string,
	likeCount: integer,
	dislikeCount: integer
};