import { getUserByUnsafeID } from 'modules/server/users';
import type { UserDocument } from 'modules/server/users';
import type { UnsafeObjectID } from 'modules/server/db';
import type { APIRequest, APIResponse } from 'modules/server/api';
import type { PageRequest } from 'modules/server/pages';
import { authenticate } from './auth';

export enum Perm {
	/** Permission to grant or revoke perms for any user (including yourself). */
	writePerms = 'writePerms',
	/** Permission to access (but not edit or delete) anything which at least one normal client can access. */
	sudoRead = 'sudoRead',
	/** Permission to edit (but not delete) anything which at least one normal client can edit. */
	sudoWrite = 'sudoWrite',
	/** Permission to delete anything (except other users with this perm) which at least one normal client can delete, and permission to ban any user without this perm. */
	sudoDelete = 'sudoDelete',
	/** Permission to verify the security of potentially insecure scripts written by users. */
	verifyScripts = 'verifyScripts',
	/** Permission to edit the achievements of any user. */
	writeAchievements = 'writeAchievements'
}

/**
 * Requires a user to have certain perms.
 *
 * Returns a promise which either:
 * * Resolves with void if the user has at least one of the perms.
 * * Does not resolve and sends an HTTP error response if the user has insufficient perms and an `APIResponse` is provided.
 * * Resolves with an object of the error's status code if the user has insufficient perms and no `APIResponse` is provided.
 *
 * Examples:
 * ```
 * await userHasPerm(res, user, [Perm.sudoWrite, Perm.sudoDelete]);
 * await userHasPerm(false, req.user, Perm.sudoRead);
 * ```
 */
export function userHasPerm(
	/** This request's `APIResponse` object, or `false` if no response should be sent on error (i.e. if this is a page and not an API). */
	res: APIResponse,
	/** The user to check the perms of. */
	user: UserDocument | undefined,
	/** The perm or perms to require. If set to an empty array, the user will always have insufficient perms. */
	perms: Perm | Perm[]
): Promise<void>;

export function userHasPerm(
	/** This request's `APIResponse` object, or `false` if no response should be sent on error (i.e. if this is a page and not an API). */
	res: APIResponse | false,
	/** The user to check the perms of. */
	user: UserDocument | undefined,
	/** The perm or perms to require. If set to an empty array, the user will always have insufficient perms. */
	perms: Perm | Perm[]
): Promise<void | { statusCode: number }>;

// This ESLint comment is necessary because the rule wants me to use an arrow function, which does not allow for the overloading used here.
// eslint-disable-next-line func-style
export function userHasPerm(
	/** This request's `APIResponse` object, or `false` if no response should be sent on error (i.e. if this is a page and not an API). */
	res: APIResponse | false,
	/** The user to check the perms of. */
	user: UserDocument | undefined,
	/** The perm or perms to require. If set to an empty array, the user will always have insufficient perms. */
	perms: Perm | Perm[]
) {
	return new Promise<void | { statusCode: number }>(resolve => {
		if (
			user && (
				(
					// `perms` is an array of `Perm`s.
					Array.isArray(perms)
					&& perms.some(perm => user.perms[perm])
				) || (
					// `perms` is a single `Perm`.
					user.perms[perms as Perm]
				)
			)
		) {
			resolve();
			return;
		}

		// The user does not have one of the perms.
		if (res) {
			res.status(403).send({
				message: `You are missing at least one of the following perms:\n${Array.isArray(perms) ? perms.join(', ') : perms}`
			});
		} else {
			resolve({ statusCode: 403 });
		}
	});
}

/**
 * Requires a user to have permission to get another user by potentially unsafe ID.
 *
 * Returns a promise which either:
 * * Resolves with an object of the requested user if `user` is the requested user or `user` has at least one of the perms.
 * * Does not resolve and sends an HTTP error response if there is an error and an `APIResponse` is provided.
 * * Resolves with an object of the error's status code if there is an error and no `APIResponse` is provided.
 *
 * Examples:
 * ```
 * const { user } = await permToGetUser(res, authenticatedUser, req.query.userID as string, Perm.sudoRead);
 * const { user, statusCode } = await permToGetUser(false, req.user, params.userID, [Perm.sudoWrite, Perm.sudoDelete]);
 * ```
 */
function permToGetUser(
	/** This request's `APIResponse` object, or `false` if no response should be sent on error (i.e. if this is a page and not an API). */
	res: APIResponse,
	/** The user to check the perms of. */
	user: UserDocument | undefined,
	/** The potentially unsafe user ID of the user to get. */
	id: UnsafeObjectID,
	/** The perm or perms to require. If set to an empty array, the user will always have insufficient perms. */
	perms: Perm | Perm[]
): Promise<{
	user: UserDocument,
	statusCode?: undefined
}>;

function permToGetUser(
	/** This request's `APIResponse` object, or `false` if no response should be sent on error (e.g. if this is a page and not an API). */
	res: APIResponse | false,
	/** The user to check the perms of. */
	user: UserDocument | undefined,
	/** The potentially unsafe user ID of the user to get. */
	id: UnsafeObjectID,
	/** The perm or perms to require. If set to an empty array, the user will always have insufficient perms. */
	perms: Perm | Perm[]
): Promise<{
	user: UserDocument,
	statusCode?: undefined
} | {
	user?: undefined,
	statusCode: number
}>;

// This ESLint comment is necessary because the rule wants me to use an arrow function, which does not allow for the overloading used here.
// eslint-disable-next-line func-style
function permToGetUser(
	/** This request's `APIResponse` object, or `false` if no response should be sent on error (i.e. if this is a page and not an API). */
	res: APIResponse | false,
	/** The user to check the perms of. */
	user: UserDocument | undefined,
	/** The potentially unsafe user ID of the user to get. */
	id: UnsafeObjectID,
	/** The perm or perms to require. If set to an empty array, the user will always have insufficient perms. */
	perms: Perm | Perm[]
) {
	return new Promise<{
		user: UserDocument,
		statusCode?: undefined
	} | {
		user?: undefined,
		statusCode: number
	}>(async resolve => {
		if (!user) {
			// The client is not authenticated.

			if (res) {
				res.status(403).send({
					message: 'You are not authenticated.'
				});
			} else {
				resolve({ statusCode: 403 });
			}
			return;
		}

		if (id && user._id.toString() === id.toString()) {
			// The user is trying to access their own data, which is permitted.

			resolve({ user });
			return;
		}

		// If `res` is an `APIResponse` and the user has insufficient perms, this will never resolve.
		const error = await userHasPerm(res, user, perms);

		if (error) {
			// `res` is `false` and the user is trying to access someone else's data without sufficient perms.

			resolve(error);
			return;
		}

		// The user is trying to access someone else's data and has sufficient perms.

		const requestedUser = await getUserByUnsafeID(id);

		if (requestedUser) {
			resolve({ user: requestedUser });
			return;
		}

		if (res) {
			res.status(404).send({
				message: 'No user was found with the specified ID.'
			});
		} else {
			resolve({ statusCode: 404 });
		}
	});
}

/**
 * Authenticates the request and requires the authenticated user to have permission to get another user by potentially unsafe ID.
 *
 * Returns the other user if successful.
 *
 * Example:
 * ```
 * const user = await permToGetUserInAPI(req, res, req.query.userID as string, Perm.sudoWrite);
 * const user = await permToGetUserInAPI(req, res, req.query.userID as string, [Perm.sudoWrite, Perm.sudoDelete]);
 * ```
 */
export const permToGetUserInAPI = async (
	req: APIRequest,
	res: APIResponse,
	/** The potentially unsafe user ID of the user to get. */
	id: UnsafeObjectID,
	/** The perm or perms to require. If set to an empty array, the user will always have insufficient perms. */
	perms: Perm | Perm[]
) => (
	await permToGetUser(
		res,
		(await authenticate(req, res)).user,
		id,
		perms
	)
).user;

/**
 * Requires a user to have permission to get another user by potentially unsafe ID.
 *
 * Returns an object of the other user if successful, or an object of the HTTP error status code if not.
 *
 * Example:
 * ```
 * const { user, statusCode } = await permToGetUserInPage(req, params.userID, Perm.sudoRead);
 * const { user, statusCode } = await permToGetUserInPage(req, params.userID, [Perm.sudoWrite, Perm.sudoDelete]);
 * ```
 */
export const permToGetUserInPage = async (
	req: PageRequest,
	/** The potentially unsafe user ID of the user to get. */
	id: UnsafeObjectID,
	/** The perm or perms to require. If set to an empty array, the user will always have insufficient perms. */
	perms: Perm | Perm[]
) => permToGetUser(false, req.user, id, perms);