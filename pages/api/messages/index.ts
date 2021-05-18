import validate from './index.validate';
import type { APIHandler } from 'modules/server/api';
import { authenticate } from 'modules/server/auth';
import type { ClientMessage } from 'modules/client/messages';
import type { MessageDocument } from 'modules/server/messages';
import messages, { updateUnreadMessages, getClientMessage } from 'modules/server/messages';
import { ObjectId } from 'mongodb';
import { getUserByUnsafeID } from 'modules/server/users';

const Handler: APIHandler<{
	method: 'POST',
	body: Pick<ClientMessage, 'to' | 'subject' | 'content'>
}, {
	method: 'POST',
	body: ClientMessage
}> = async (req, res) => {
	await validate(req, res);

	const { user } = await authenticate(req, res);

	if (!user) {
		res.status(403).send({
			message: 'You must be signed in to send messages.'
		});
		return;
	}

	const now = new Date();

	const recipientIDs = await Promise.all(req.body.to.map(
		async unsafeUserID => (await getUserByUnsafeID(unsafeUserID, res))._id
	));

	const message: MessageDocument = {
		_id: new ObjectId(),
		sent: now,
		from: user._id,
		to: recipientIDs,
		notDeletedBy: recipientIDs,
		notReadBy: recipientIDs,
		subject: req.body.subject,
		content: req.body.content
	};

	await messages.insertOne(message);

	await Promise.all(recipientIDs.map(updateUnreadMessages));

	res.status(201).send(getClientMessage(message));
};

export default Handler;