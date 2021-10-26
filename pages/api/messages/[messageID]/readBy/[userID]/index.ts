import validate from './index.validate';
import type { APIHandler } from 'lib/server/api';
import messages, { getMessageByUnsafeID, updateUnreadMessages } from 'lib/server/messages';
import { Perm } from 'lib/client/perms';
import { permToGetUserInAPI } from 'lib/server/permToGetUser';
import type { integer } from 'lib/types';

const Handler: APIHandler<{
	query: {
		messageID: string,
		userID: string
	},
	method: 'PUT',
	/** `true` if the message should be marked as read, or `false` if it should be marked as unread. */
	body: boolean
}, {
	method: 'PUT',
	body: {
		unreadMessageCount: integer
	}
}> = async (req, res) => {
	await validate(req, res);

	const user = await permToGetUserInAPI(req, res, Perm.sudoWrite);

	const message = await getMessageByUnsafeID(req.query.messageID, res);

	if (!message.notDeletedBy.some(userID => userID.equals(user._id))) {
		res.status(422).send({
			message: 'The specified user does not have access to the specified message.'
		});
		return;
	}

	// Check if this request would lead to any change.
	if (req.body === message.notReadBy.some(userID => userID.equals(user._id))) {
		await messages.updateOne({
			_id: message._id
		}, {
			[req.body ? '$pull' : '$push']: {
				notReadBy: user._id
			}
		});

		user.unreadMessageCount = await updateUnreadMessages(user._id);
	}

	res.send({
		unreadMessageCount: user.unreadMessageCount
	});
};

export default Handler;