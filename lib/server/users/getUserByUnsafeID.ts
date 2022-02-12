import type { ServerUser } from 'lib/server/users';
import users from 'lib/server/users';
import type { APIResponse } from 'lib/server/api';
import parseID from 'lib/server/db/parseID';

/**
 * Finds and returns a `ServerUser` by a possibly invalid ID.
 *
 * Returns `undefined` if the ID is invalid, the user is not found, or the user is scheduled for deletion.
 *
 * If the `res` parameter is specified, failing to find a valid user will result in an error response, and this function will never resolve.
 */
const getUserByUnsafeID = <Res extends APIResponse<any> | undefined>(
	...[id, res]: [
		id: string | undefined,
		res: Res
	] | [
		id: string | undefined
		// It is necessary to use tuple types instead of simply having `res` be an optional parameter, because otherwise `Res` will not always be inferred correctly.
	]
) => new Promise<ServerUser | (undefined extends Res ? undefined : never)>(async resolve => {
	const userID = parseID(id);

	let user: ServerUser | null | undefined;

	if (userID) {
		user = await users.findOne({
			_id: userID,
			willDelete: { $exists: false }
		});
	}

	if (!user) {
		if (res) {
			res.status(404).send({
				message: 'No user was found with the specified ID.'
			});
		} else {
			resolve(undefined as any);
		}

		return;
	}

	resolve(user);
});

export default getUserByUnsafeID;