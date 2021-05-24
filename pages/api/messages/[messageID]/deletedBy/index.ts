import validate from './index.validate';
import type { APIHandler } from 'modules/server/api';
import type { MessageDocument } from 'modules/server/messages';
import messages, { getMessageByUnsafeID } from 'modules/server/messages';
import { Perm } from 'modules/client/perms';
import { permToGetUserInAPI } from 'modules/server/perms';

/** If the inputted message was a reply to another parent message which has been deleted by everyone, fully deletes the parent message as well. */
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

const Handler: APIHandler<{
	query: {
		messageID: string
	},
	body: {
		user: string
	},
	method: 'POST'
}> = async (req, res) => {
	await validate(req, res);

	const user = await permToGetUserInAPI(req, res, Perm.sudoDelete, req.body.user);

	const message = await getMessageByUnsafeID(req.query.messageID, res);

	if (!message.notDeletedBy.some(userID => userID.equals(user._id))) {
		res.status(422).send({
			message: 'The specified user cannot delete the specified message.'
		});
		return;
	}

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
				notDeletedBy: user._id,
				notReadBy: user._id
			}
		});
	}

	res.end();
};

export default Handler;