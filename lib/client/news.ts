import type { ServerNews } from 'lib/server/news';
import type { DateNumber } from 'lib/types';

/** All keys whose values have the same serializable type in both `ServerNews` and `ClientNews`. */
type ClientNewsKey = 'content';

/** A serializable version of `ServerNews` with only the properties that can safely be exposed to any client. */
export type ClientNews = Pick<ServerNews, ClientNewsKey> & {
	id: string,
	posted: DateNumber,
	edited?: DateNumber,
	author: string
};