import type { ObjectId } from 'mongodb';
import db from 'modules/server/db';
import type { UserDocument } from 'modules/server/users';

export type MessageDocument = {
	_id: ObjectId,
	sent: Date,
	edited?: Date,
	from: UserDocument['_id'],
	/** @minItems 1 */
	to: Array<UserDocument['_id']>,
	/** The message ID which this is a reply to, or undefined if it is not a reply. */
	replyTo?: MessageDocument['_id'],
	notDeletedBy: Array<UserDocument['_id']>,
	notReadBy: Array<UserDocument['_id']>,
	/**
	 * @minLength 1
	 * @maxLength 50
	 */
	subject: string,
	/**
	 * @minLength 1
	 * @maxLength 20000
	 */
	content: string
};

const messages = db.collection<MessageDocument>('messages');

export default messages;