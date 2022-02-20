import type { ObjectId } from 'mongodb';

/** Converts an `ObjectId` into a Base64 URL string. */
const stringifyID = (id: ObjectId) => id.toString('base64url');

export default stringifyID;