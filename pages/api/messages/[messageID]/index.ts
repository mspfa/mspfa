import validate from './index.validate';
import type { APIHandler } from 'lib/server/api';
import authenticate from 'lib/server/auth/authenticate';
import type { ServerMessage } from 'lib/server/messages';
import messages, { getClientMessage } from 'lib/server/messages';
import updateUnreadMessages from 'lib/server/messages/updateUnreadMessages';
import getMessageByUnsafeID from 'lib/server/messages/getMessageByUnsafeID';
import { Perm } from 'lib/client/perms';
import type { ClientMessage } from 'lib/client/messages';

const Handler: APIHandler<{
	query: {
		messageID: string
	}
} & (
	{
		method: 'DELETE'
	} | {
		method: 'PATCH',
		body: Partial<Pick<ClientMessage, 'content'>>
	}
), {
	method: 'PATCH',
	body: ClientMessage
}> = async (req, res) => {
	await validate(req, res);

	const { user } = await authenticate(req, res);

	if (req.method === 'DELETE') {
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

		await Promise.all(message.notReadBy.map(updateUnreadMessages));

		res.status(204).end();
		return;
	}

	// If this point is reached, `req.method === 'PATCH'`.

	const message = await getMessageByUnsafeID(req.query.messageID, res);

	if (!(
		user && (
			message.from.equals(user._id)
			|| user.perms & Perm.sudoWrite
		)
	)) {
		res.status(403).send({
			message: 'You do not have permission to edit the specified message.'
		});
		return;
	}

	const messageChanges: Partial<ServerMessage> = {
		...req.body,
		edited: new Date()
	};

	Object.assign(message, messageChanges);

	await messages.updateOne({
		_id: message._id
	}, {
		$set: messageChanges
	});

	res.send(getClientMessage(message, user));
};

export default Handler;