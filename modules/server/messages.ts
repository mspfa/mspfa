import type { ObjectId } from 'mongodb';
import db from 'modules/server/db';
import type { UserID } from 'modules/server/users';

export type MessageID = ObjectId;

export type MessageDocument = {
	_id: MessageID,
	sent: Date,
	edited?: Date,
	from: UserID,
	/**
	 * @minItems 1
	 * @uniqueItems true
	 */
	to: UserID[],
	/** The message ID which this is a reply to, or undefined if it is not a reply. */
	replyTo?: MessageID,
	notDeletedBy: UserID[],
	notReadBy: UserID[],
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