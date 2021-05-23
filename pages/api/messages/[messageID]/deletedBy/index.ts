import validate from './index.validate';
import type { APIHandler } from 'modules/server/api';
import messages, { getMessageByUnsafeID } from 'modules/server/messages';
import { Perm } from 'modules/client/perms';
import { permToGetUserInAPI } from 'modules/server/perms';

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

	if (message.notDeletedBy.length === 1) {
		// This user is the only one who hasn't deleted it yet, so the message can be fully deleted from the database.

		await messages.deleteOne({
			_id: message._id
		});
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