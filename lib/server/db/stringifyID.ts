import replaceAll from 'lib/client/replaceAll';
import type { ObjectId } from 'mongodb';

/** Converts an `ObjectId` into a Base64-ish string. */
const stringifyID = (id: ObjectId) => {
	let string = id.id.toString('base64');

	// Alter the Base64 alphabet to be nicer for URLs.
	string = replaceAll(string, '/', '-');
	string = replaceAll(string, '+', '_');

	// Note: It is impossible for the string to have equal signs, since the `id.id` buffer is always exactly 12 bytes.

	return string;
};

export default stringifyID;