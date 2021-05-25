import validate from './index.validate';
import type { APIHandler } from 'modules/server/api';
import messages, { getMessageByUnsafeID, updateUnreadMessages } from 'modules/server/messages';
import { Perm } from 'modules/client/perms';
import { permToGetUserInAPI } from 'modules/server/perms';

const Handler: APIHandler<{
	query: {
		messageID: string
	},
	method: 'POST',
	body: {
		userID: string
	}
}, {
	method: 'POST',
	body: {
		unreadMessageCount: number
	}
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

	res.send({
		unreadMessageCount: await updateUnreadMessages(user._id)
	});
};

export default Handler;