import { ObjectId } from 'mongodb';

/** Parses the inputted Base64 URL string as an `ObjectId`, or returns `undefined` if the input is invalid. */
const parseID = (string: string | undefined) => {
	if (string === undefined) {
		return;
	}

	try {
		return new ObjectId(
			Buffer.from(string, 'base64url')
		);
	} catch {}
};

export default parseID;