import type { ServerStory, StoryID, ServerStoryPage, StoryPageID } from 'lib/server/stories';
import type { DateNumber, integer } from 'lib/types';
import type { ClientColor, ClientColorGroup } from 'lib/client/colors';

/** All keys whose values have the same serializable type in both `ServerStory` and `PrivateStory`. */
type PrivateStoryKey = 'anniversary' | 'title' | 'status' | 'privacy' | 'author' | 'description' | 'icon' | 'pageCount' | 'favCount' | 'banner' | 'style' | 'script' | 'tags' | 'allowComments' | 'sidebarContent' | 'defaultPageTitle';

/** A serializable version of `ServerStory` with only the properties that can safely be exposed to any client. */
export type PrivateStory = Pick<ServerStory, PrivateStoryKey> & {
	id: StoryID,
	willDelete?: DateNumber,
	created: DateNumber,
	updated: DateNumber,
	owner: string,
	editors: string[],
	pageCount: integer,
	colorGroups: ClientColorGroup[],
	colors: ClientColor[]
};

/** All keys whose values have the same serializable type in both `ServerStory` and `PublicStory`. */
type PublicStoryKey = 'anniversary' | 'title' | 'status' | 'privacy' | 'author' | 'description' | 'icon' | 'pageCount' | 'favCount' | 'style' | 'script' | 'tags' | 'allowComments' | 'sidebarContent';

/** A serializable version of `ServerStory` with only the properties that can safely be exposed to any client. */
export type PublicStory = Pick<ServerStory, PublicStoryKey> & {
	id: StoryID,
	created: DateNumber,
	updated: DateNumber,
	owner: string,
	editors: string[],
	pageCount: integer
};

/** All keys whose values have the same serializable type in both `ServerStoryPage` and `ClientStoryPage`. */
type ClientStoryPageKey = 'id' | 'title' | 'content' | 'nextPages' | 'unlisted' | 'disableControls' | 'commentary' | 'silent';

/** A serializable version of `ServerStoryPage` with only the properties that can safely be exposed to any client. */
export type ClientStoryPage = Pick<ServerStoryPage, ClientStoryPageKey> & {
	published?: DateNumber
};

export type ClientStoryPageRecord = Record<StoryPageID, ClientStoryPage>;

/** An array of objects, each containing information about one listing in a story's log.  */
export type StoryLogListings = Array<Pick<ClientStoryPage, 'id' | 'published' | 'title'>>;