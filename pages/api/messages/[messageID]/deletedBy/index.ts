import validate from './index.validate';
import type { APIHandler } from 'modules/server/api';
import { deleteMessageForUser, getMessageByUnsafeID, updateUnreadMessages } from 'modules/server/messages';
import { Perm } from 'modules/client/perms';
import { permToGetUserInAPI } from 'modules/server/perms';

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

	const user = await permToGetUserInAPI(req, res, Perm.sudoDelete, req.body.userID);

	const message = await getMessageByUnsafeID(req.query.messageID, res);

	if (!message.notDeletedBy.some(userID => userID.equals(user._id))) {
		res.status(422).send({
			message: 'The specified user cannot delete the specified message.'
		});
		return;
	}

	await deleteMessageForUser(user._id, message);

	await updateUnreadMessages(user._id);

	res.end();
};

export default Handler;