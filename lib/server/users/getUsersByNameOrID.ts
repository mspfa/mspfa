import type { ServerUser } from 'lib/server/users';
import users from 'lib/server/users';
import { connection } from 'lib/server/db';
import parseID from 'lib/server/db/parseID';
import type { Filter } from 'mongodb';
import { escapeRegExp } from 'lodash';

const getUsersByNameOrID = async (nameOrID: string) => {
	await connection;

	let filter: Filter<ServerUser> = {
		name: {
			$regex: new RegExp(escapeRegExp(nameOrID), 'i')
		},
		willDelete: { $exists: false }
	};

	const userID = parseID(nameOrID);
	if (userID) {
		delete filter.willDelete;

		filter = {
			$or: [
				{ _id: userID },
				filter
			],
			willDelete: { $exists: false }
		};
	}

	const lowercaseSearch = nameOrID.toLowerCase();

	return (
		await users.find!(filter).toArray()
	).sort((a, b) => (
		// Sort by lowest search index first.
		a.name.toLowerCase().indexOf(lowercaseSearch) - b.name.toLowerCase().indexOf(lowercaseSearch)
		// If search indexes are equal, sort by last seen first.
		|| +b.lastSeen - +a.lastSeen
	));
};

export default getUsersByNameOrID;