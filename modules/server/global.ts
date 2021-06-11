// This script is executed once initially on the server.

import users from 'modules/server/users';
import stories from 'modules/server/stories';

const arbitraryInterval = () => {
	const now = new Date();

	users.deleteMany({
		willDelete: {
			$lte: now
		}
	});

	stories.deleteMany({
		willDelete: {
			$lte: now
		}
	});
};

arbitraryInterval();

// Don't run this interval on dev, because dev would run this interval many times and require a restart to stop any of them.
if (process.env.NODE_ENV !== 'development') {
	setInterval(arbitraryInterval, 1000 * 60 * 15);
}

export default {};