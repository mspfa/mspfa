import messages from 'lib/server/messages';
import type { ServerUserID } from 'lib/server/users';
import users from 'lib/server/users';
import type { integer } from 'lib/types';

/** Updates the specified user's `unreadMessageCount`. Returns the new `unreadMessageCount` value. */
const updateUnreadMessages = async (userID: ServerUserID) => {
	const unreadMessageCount = (
		await messages.aggregate!<{ unreadMessageCount: integer }>([
			{ $match: { notReadBy: userID } },
			{ $count: 'unreadMessageCount' }
		]).next()
	)?.unreadMessageCount || 0;

	await users.updateOne({
		_id: userID
	}, {
		$set: { unreadMessageCount }
	});

	return unreadMessageCount;
};

export default updateUnreadMessages;