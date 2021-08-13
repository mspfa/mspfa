import type { ObjectId } from 'mongodb';
import type { UnsafeObjectID } from 'lib/server/db';
import db, { safeObjectID } from 'lib/server/db';
import type { ServerUser, ServerUserID } from 'lib/server/users';
import type { ClientMessage } from 'lib/client/messages';
import users from 'lib/server/users';
import type { APIResponse } from 'lib/server/api';
import type { integer } from 'lib/types';

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
	content: message.content,
	read: !message.notReadBy.some(userID => userID.equals(user._id))
});

const messages = db.collection<ServerMessage>('messages');

export default messages;

/**
 * Finds and returns a `ServerMessage` by a possibly unsafe ID.
 *
 * Returns `undefined` if the ID is invalid or the message is not found.
 *
 * If the `res` parameter is specified, failing to find a valid message will result in an error response, and this function will never resolve.
 */
export const getMessageByUnsafeID = <Res extends APIResponse<any> | undefined>(
	...[id, res]: [
		id: UnsafeObjectID,
		res: Res
	] | [
		id: UnsafeObjectID
		// It is necessary to use tuple types instead of simply having `res` be an optional parameter, because otherwise `Res` will not always be inferred correctly.
	]
) => new Promise<ServerMessage | (undefined extends Res ? undefined : never)>(async resolve => {
	const messageID = safeObjectID(id);

	let message: ServerMessage | null | undefined;

	if (messageID) {
		message = await messages.findOne({
			_id: messageID
		});
	}

	if (!message) {
		if (res) {
			res.status(404).send({
				message: 'No message was found with the specified ID.'
			});
		} else {
			resolve(undefined as any);
		}

		return;
	}

	resolve(message);
});

/** Updates the specified user's `unreadMessageCount`. Returns the new `unreadMessageCount` value. */
export const updateUnreadMessages = async (userID: ServerUserID) => {
	const unreadMessageCount = (
		await messages.aggregate!([
			{ $match: { notReadBy: userID } },
			{ $count: 'unreadMessageCount' }
		]).next<{ unreadMessageCount: integer }>()
	)?.unreadMessageCount || 0;

	await users.updateOne({
		_id: userID
	}, {
		$set: { unreadMessageCount }
	});

	return unreadMessageCount;
};

/** If the inputted message was a reply to another parent message which has been deleted by everyone, fully deletes the parent message as well, and repeats the check recursively on all ascendants. */
const deleteUnnecessaryParentMessages = async (message: ServerMessage) => {
	if (message.replyTo) {
		const { value: parentMessage } = await messages.findOneAndDelete({
			_id: message.replyTo,
			notDeletedBy: { $size: 0 }
		});

		if (parentMessage) {
			await deleteUnnecessaryParentMessages(parentMessage);
		}
	}
};

/**
 * Deletes a message for a user.
 *
 * ⚠️ This assumes the message is not already deleted by the user.
 */
export const deleteMessageForUser = async (
	/** The user for which the message should be deleted. */
	userID: ServerUserID,
	/** The message to delete. */
	message: ServerMessage
) => {
	if (
		// Check if this user is the only one who hasn't deleted it yet.
		message.notDeletedBy.length === 1
		// Check if it has no replies.
		&& !(await messages.findOne({ replyTo: message._id }))
	) {
		// It can safely be fully deleted from the database.

		await messages.deleteOne({
			_id: message._id
		});

		await deleteUnnecessaryParentMessages(message);
	} else {
		await messages.updateOne({
			_id: message._id
		}, {
			$pull: {
				notDeletedBy: userID,
				notReadBy: userID
			}
		});
	}
};