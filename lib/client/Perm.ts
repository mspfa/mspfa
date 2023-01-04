import type { PrivateUser } from 'lib/client/users';
import type { ServerUser } from 'lib/server/users';
import type { integer } from 'lib/types';

enum Perm {
	/** Permission to grant or revoke `Perm`s for users (including yourself). */
	EDIT_PERMS = 0b1,
	/** Permission to access (but not necessarily delete or edit) anything at least one normal client can access. */
	READ = 0b10,
	/** Permission to delete (but not necessarily access or edit) anything at least one normal client can delete. */
	DELETE = 0b100,
	/** Permission to edit (but not necessarily access or delete) anything at least one normal client can edit. */
	WRITE = 0b1000,
	/** Permission to ban users. */
	BAN = 0b10000,
	/** Permission to verify the security of potentially insecure scripts written by users. */
	VERIFY_SCRIPTS = 0b10000,
	/** Permission to edit the achievements of users. */
	EDIT_ACHIEVEMENTS = 0b100000
}

export default Perm;

/**
 * Checks if a user has all the specified `Perm`s.
 *
 * If the user is `undefined`, returns `false`.
 */
export const hasPerms = (
	/** The user to check the perms of. */
	user: ServerUser | PrivateUser | undefined,
	/** The `Perm` or array of `Perm`s to require. */
	perms: Perm | Perm[]
): boolean => {
	if (!user) {
		return false;
	}

	if (Array.isArray(perms)) {
		return perms.every(perm => user.perms & perm);
	}

	return Boolean(user.perms & perms);
};
