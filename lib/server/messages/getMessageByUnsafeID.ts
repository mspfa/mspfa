import type { ServerMessage } from 'lib/server/messages';
import messages from 'lib/server/messages';
import type { APIResponse } from 'lib/server/api';
import parseID from 'lib/server/db/parseID';

/**
 * Finds and returns a `ServerMessage` by a possibly invalid ID.
 *
 * Returns `undefined` if the ID is invalid or the message is not found.
 *
 * If the `res` parameter is specified, failing to find a valid message will result in an error response, and this function will never resolve.
 */
const getMessageByUnsafeID = <Res extends APIResponse<any> | undefined>(
	...[id, res]: [
		id: string | undefined,
		res: Res
	] | [
		id: string | undefined
		// It is necessary to use tuple types instead of simply having `res` be an optional parameter, because otherwise `Res` will not always be inferred correctly.
	]
) => new Promise<ServerMessage | (undefined extends Res ? undefined : never)>(async resolve => {
	const messageID = parseID(id);

	let message: ServerMessage | null | undefined;

	if (messageID) {
		message = await messages.findOne({
			_id: messageID
		});
	}

	if (!message) {
		if (res) {
			res.status(404).send({
				message: 'No message was found with the specified ID.'
			});
		} else {
			resolve(undefined as any);
		}

		return;
	}

	resolve(message);
});

export default getMessageByUnsafeID;