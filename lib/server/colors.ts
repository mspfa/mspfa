import type { ClientColor, ClientColorGroup } from 'lib/client/colors';
import type { ObjectId } from 'mongodb';

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
	id: colorGroup.id.toString(),
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
	id: color.id.toString(),
	...color.group && {
		group: color.group.toString()
	},
	name: color.name,
	value: color.value
});