import type { ObjectId } from 'mongodb';
import db from 'modules/server/db';

export type MessageDocument = {
	_id: ObjectId,
	/** The message ID which this is a reply to. */
	replyTo: string,
	sent: Date,
	edited?: Date,
	from: string,
	to: string[],
	notDeletedBy: string[],
	notReadBy: string[],
	subject: string,
	content: string
};

const messages = db.collection<MessageDocument>('messages');

export default messages;