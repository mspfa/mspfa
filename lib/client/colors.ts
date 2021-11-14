import type { ServerColor } from 'lib/server/colors';

/** All keys whose values have the same serializable type in both `ServerColor` and `ClientColor`. */
type ClientServerColorKey = 'name' | 'value';

/** A serializable version of `ServerColor` with only the properties that can safely be exposed to any client. */
export type ClientColor = Pick<ServerColor, ClientServerColorKey> & {
	id: string
};