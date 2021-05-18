import type { ObjectId } from 'mongodb';
import db from 'modules/server/db';
import type { UserID } from 'modules/server/users';
import type { ClientMessage } from 'modules/client/messages';
import users from 'modules/server/users';

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

/** Converts a `MessageDocument` to a `ClientMessage`. */
export const getClientMessage = (message: MessageDocument): ClientMessage => ({
	id: message._id.toString(),
	sent: +message.sent,
	...message.edited !== undefined && {
		edited: +message.edited
	},
	from: message.from.toString(),
	to: message.to.map(String),
	...message.replyTo !== undefined && {
		replyTo: message.replyTo.toString()
	},
	subject: message.subject,
	content: message.content
});

const messages = db.collection<MessageDocument>('messages');

export default messages;

export const updateUnreadMessages = async (userID: UserID) => {
	const unreadMessageCount = (
		await messages.aggregate!([
			{ $match: { notReadBy: userID } },
			{ $count: 'unreadMessageCount' }
		]).next() as { unreadMessageCount: number } | null
	)?.unreadMessageCount || 0;

	await users.updateOne({
		_id: userID
	}, {
		$set: { unreadMessageCount }
	});
};