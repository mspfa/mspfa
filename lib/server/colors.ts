import type { ClientColor } from 'lib/client/colors';
import type { ObjectId } from 'mongodb';

export type ColorID = ObjectId;

export type ServerColor = {
	id: ColorID,
	name: string,
	value: string
};

/** Converts a `ServerColor` to a `ClientColor`. */
export const getClientColor = (color: ServerColor): ClientColor => ({
	id: color.id.toString(),
	name: color.name,
	value: color.value
});