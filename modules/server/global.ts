// This script is executed once initially on the server.

import users from 'modules/server/users';
import stories, { unscheduleStory, updateStorySchedule } from 'modules/server/stories';
import { connection } from 'modules/server/db';
import messages, { deleteMessageForUser } from 'modules/server/messages';

connection.then(() => {
	// Set timeouts for any scheduled pages.
	stories.find!().forEach(story => {
		updateStorySchedule(story);
	});

	const arbitraryInterval = () => {
		const now = new Date();

		users.find!({
			willDelete: {
				$lte: now
			}
		}).forEach(user => {
			messages.find!({ notDeletedBy: user._id }).forEach(message => {
				deleteMessageForUser(user._id, message);
			});

			users.deleteOne({ _id: user._id });
		});

		stories.find!({
			willDelete: {
				$lte: now
			}
		}).forEach(story => {
			unscheduleStory(story._id);

			stories.deleteOne({ _id: story._id });
		});
	};

	arbitraryInterval();

	// Don't run this interval on dev, because dev would run this interval many times and require a restart to stop any of them.
	if (process.env.NODE_ENV !== 'development') {
		// Run the interval every 15 minutes.
		setInterval(arbitraryInterval, 1000 * 60 * 15);
	}
});

export default {};