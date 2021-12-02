import type { ServerMessage } from 'lib/server/messages';
import messages from 'lib/server/messages';
import type { ServerUserID } from 'lib/server/users';

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
const deleteMessageForUser = async (
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

export default deleteMessageForUser;