import type { ServerNewsPost } from 'lib/server/news';
import type { DateNumber } from 'lib/types';

/** All keys whose values have the same serializable type in both `ServerNewsPost` and `ClientNewsPost`. */
type ClientNewsPostKey = 'content';

/** A serializable version of `ServerNewsPost` with only the properties that can safely be exposed to any client. */
export type ClientNewsPost = Pick<ServerNewsPost, ClientNewsPostKey> & {
	id: string,
	posted: DateNumber,
	edited?: DateNumber,
	author: string
};