import validate from './index.validate';
import type { APIHandler } from 'modules/server/api';
import { authenticate } from 'modules/server/auth';
import messages, { getMessageByUnsafeID } from 'modules/server/messages';
import { Perm } from 'modules/client/perms';

const Handler: APIHandler<{
	query: {
		messageID: string
	},
	method: 'DELETE'
}> = async (req, res) => {
	await validate(req, res);

	const { user } = await authenticate(req, res);

	if (!(user && user.perms & Perm.sudoDelete)) {
		res.status(403).send({
			message: 'You do not have permission to delete messages.'
		});
		return;
	}

	const message = await getMessageByUnsafeID(req.query.messageID, res);

	await messages.deleteOne({
		_id: message._id
	});

	res.end();
};

export default Handler;