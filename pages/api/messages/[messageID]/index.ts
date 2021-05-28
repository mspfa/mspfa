import validate from './index.validate';
import type { APIHandler } from 'modules/server/api';
import { authenticate } from 'modules/server/auth';
import type { MessageDocument } from 'modules/server/messages';
import messages, { getMessageByUnsafeID, getClientMessage, updateUnreadMessages } from 'modules/server/messages';
import { Perm } from 'modules/client/perms';
import type { ClientMessage } from 'modules/client/messages';

const Handler: APIHandler<{
	query: {
		messageID: string
	}
} & (
	{
		method: 'DELETE'
	} | {
		method: 'PUT',
		body: Partial<Pick<MessageDocument, 'content'>>
	}
), {
	method: 'PUT',
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

		res.end();
		return;
	}

	// If this point is reached, `req.method === 'PUT'`.

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

	const messageMerge: Partial<MessageDocument> = {
		...req.body,
		edited: new Date()
	};

	Object.assign(message, messageMerge);

	await messages.updateOne({
		_id: message._id
	}, {
		$set: messageMerge
	});

	res.send(getClientMessage(message, user));
};

export default Handler;