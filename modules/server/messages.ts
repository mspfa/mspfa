import type { ObjectId } from 'mongodb';

export type Message = {
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