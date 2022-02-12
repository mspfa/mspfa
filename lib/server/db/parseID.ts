import replaceAll from 'lib/client/replaceAll';
import { ObjectId } from 'mongodb';

/** Parses the inputted Base64-ish string as an `ObjectId`, or returns `undefined` if the input is invalid. */
const parseID = (string: string | undefined) => {
	if (string === undefined) {
		return;
	}

	try {
		// Undo the changes to the Base64 alphabet done by `stringifyID`.
		string = replaceAll(string, '-', '/');
		string = replaceAll(string, '_', '+');

		return new ObjectId(
			Buffer.from(string, 'base64')
		);
	} catch {}
};

export default parseID;