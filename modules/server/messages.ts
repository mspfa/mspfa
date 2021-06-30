import type { ObjectId } from 'mongodb';
import type { UnsafeObjectID } from 'modules/server/db';
import db, { safeObjectID } from 'modules/server/db';
import type { UserDocument, UserID } from 'modules/server/users';
import type { ClientMessage } from 'modules/client/messages';
import users from 'modules/server/users';
import type { APIResponse } from 'modules/server/api';

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
	/** The IDs of users who have access to this message. */
	notDeletedBy: UserID[],
	/** The IDs of users who have access to this message and have it marked as unread. */
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
export const getClientMessage = (
	message: MessageDocument,
	/** The user accessing this message, or the user whose list this message is being rendered to. */
	user: UserDocument
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

const messages = db.collection<MessageDocument>('messages');

export default messages;

/**
 * Finds and returns a `MessageDocument` by a possibly unsafe ID.
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
) => new Promise<MessageDocument | (undefined extends Res ? undefined : never)>(async resolve => {
	const messageID = safeObjectID(id);

	let message: MessageDocument | null | undefined;

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

	return unreadMessageCount;
};

/** If the inputted message was a reply to another parent message which has been deleted by everyone, fully deletes the parent message as well, and repeats the check recursively on all ascendants. */
const deleteUnnecessaryParentMessages = async (message: MessageDocument) => {
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
	userID: UserID,
	/** The message to delete. */
	message: MessageDocument
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