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
		userID: string
	},
	method: 'POST'
}> = async (req, res) => {
	await validate(req, res);

	const user = await permToGetUserInAPI(req, res, Perm.sudoWrite, req.body.userID);

	const message = await getMessageByUnsafeID(req.query.messageID, res);

	if (!message.notDeletedBy.some(userID => userID.equals(user._id))) {
		res.status(422).send({
			message: 'The specified user does not have permission to mark the specified message as read.'
		});
		return;
	}

	if (!message.notReadBy.some(userID => userID.equals(user._id))) {
		res.status(422).send({
			error: 'ALREADY_EXISTS',
			message: 'The specified user has already read the specified message.'
		});
		return;
	}

	await messages.updateOne({
		_id: message._id
	}, {
		$pull: {
			notReadBy: user._id
		}
	});

	res.end();
};

export default Handler;