export enum Perm {
	/** Permission to grant or revoke perms for users (including yourself). */
	writePerms = 0b1,
	/** Permission to access (but not necessarily edit or delete) things which at least one normal client can access. */
	sudoRead = 0b10,
	/** Permission to edit (but not necessarily delete) things which at least one normal client can edit. */
	sudoWrite = 0b100,
	/** Permission to delete things which at least one normal client can delete, and permission to ban users. */
	sudoDelete = 0b1000,
	/** Permission to verify the security of potentially insecure scripts written by users. */
	verifyScripts = 0b10000,
	/** Permission to edit the achievements of users. */
	writeAchievements = 0b100000
}