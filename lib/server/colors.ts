import type { ClientColor, ClientColorGroup } from 'lib/client/colors';
import type { ObjectId } from 'mongodb';
import stringifyID from 'lib/server/db/stringifyID';

export type ColorID = ObjectId;
export type ColorGroupID = ObjectId;

export type ServerColorGroup = {
	id: ColorGroupID,
	/**
	 * @minLength 1
	 * @maxLength 50
	 */
	name: string
};

/** Converts a `ServerColor` to a `ClientColor`. */
export const getClientColorGroup = (colorGroup: ServerColorGroup): ClientColorGroup => ({
	id: stringifyID(colorGroup.id),
	name: colorGroup.name
});

export type ServerColor = {
	id: ColorID,
	/** The ID of the color group which the color belongs to, or undefined if the color is not in a group. */
	group?: ColorGroupID,
	/**
	 * @minLength 1
	 * @maxLength 50
	 */
	name: string,
	/**
	 * @minLength 1
	 * @maxLength 50
	 */
	value: string
};

/** Converts a `ServerColor` to a `ClientColor`. */
export const getClientColor = (color: ServerColor): ClientColor => ({
	id: stringifyID(color.id),
	...color.group && {
		group: stringifyID(color.group)
	},
	name: color.name,
	value: color.value
});