import type { ObjectId } from 'mongodb';
import db from 'lib/server/db';
import type { ServerUser, ServerUserID } from 'lib/server/users';
import type { ClientMessage } from 'lib/client/messages';
import stringifyID from 'lib/server/db/stringifyID';

export type ServerMessageID = ObjectId;

/** A message object used on the server and stored in the database. No `ServerMessage` should ever be on the client. */
export type ServerMessage = {
	_id: ServerMessageID,
	sent: Date,
	edited?: Date,
	from: ServerUserID,
	/**
	 * @minItems 1
	 * @uniqueItems true
	 */
	to: ServerUserID[],
	/** The message ID which this is a reply to, or undefined if it is not a reply. */
	replyTo?: ServerMessageID,
	/** The IDs of users who have access to this message. */
	notDeletedBy: ServerUserID[],
	/** The IDs of users who have access to this message and have it marked as unread. */
	notReadBy: ServerUserID[],
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

/** Converts a `ServerMessage` to a `ClientMessage`. */
export const getClientMessage = (
	message: ServerMessage,
	/** The user accessing this message, or the user whose list this message is being rendered to. */
	user: ServerUser
): ClientMessage => ({
	id: stringifyID(message._id),
	sent: +message.sent,
	...message.edited !== undefined && {
		edited: +message.edited
	},
	from: stringifyID(message.from),
	to: message.to.map(stringifyID),
	...message.replyTo !== undefined && {
		replyTo: stringifyID(message.replyTo)
	},
	subject: message.subject,
	content: message.content,
	read: !message.notReadBy.some(userID => userID.equals(user._id))
});

const messages = db.collection<ServerMessage>('messages');

export default messages;