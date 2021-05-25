import validate from './index.validate';
import type { APIHandler } from 'modules/server/api';
import messages, { getMessageByUnsafeID, updateUnreadMessages } from 'modules/server/messages';
import { Perm } from 'modules/client/perms';
import { permToGetUserInAPI } from 'modules/server/perms';

const Handler: APIHandler<{
	query: {
		messageID: string,
		userID: string
	},
	method: 'DELETE'
}, {
	method: 'DELETE',
	body: {
		unreadMessageCount: number
	}
}> = async (req, res) => {
	await validate(req, res);

	const user = await permToGetUserInAPI(req, res, Perm.sudoWrite);

	const message = await getMessageByUnsafeID(req.query.messageID, res);

	if (!message.notDeletedBy.some(userID => userID.equals(user._id))) {
		res.status(422).send({
			message: 'The specified user does not have permission to mark the specified message as unread.'
		});
		return;
	}

	if (message.notReadBy.some(userID => userID.equals(user._id))) {
		res.status(404).send({
			message: 'The specified user has already marked the specified message as unread.'
		});
		return;
	}

	await messages.updateOne({
		_id: message._id
	}, {
		$push: {
			notReadBy: user._id
		}
	});

	res.send({
		unreadMessageCount: await updateUnreadMessages(user._id)
	});
};

export default Handler;