import type { ServerColor, ServerColorGroup } from 'lib/server/colors';

/** All keys whose values have the same serializable type in both `ServerColorGroup` and `ClientColorGroup`. */
type ClientColorGroupKey = 'name';

/** A serializable version of `ServerColorGroup` with only the properties that can safely be exposed to any client. */
export type ClientColorGroup = Pick<ServerColorGroup, ClientColorGroupKey> & {
	id: string
};

/** All keys whose values have the same serializable type in both `ServerColor` and `ClientColor`. */
type ClientColorKey = 'name' | 'value';

/** A serializable version of `ServerColor` with only the properties that can safely be exposed to any client. */
export type ClientColor = Pick<ServerColor, ClientColorKey> & {
	id: string,
	group?: string
};