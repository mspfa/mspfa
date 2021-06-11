import { getUserByUnsafeID } from 'modules/server/users';
import type { UserDocument } from 'modules/server/users';
import type { UnsafeObjectID } from 'modules/server/db';
import type { APIRequest, APIResponse } from 'modules/server/api';
import type { PageRequest } from 'modules/server/pages';
import { authenticate } from 'modules/server/auth';

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
 * const { user } = await permToGetUser(res, authenticatedUser, req.query.userID, Perm.sudoRead);
 * const { user, statusCode } = await permToGetUser(undefined, req.user, params.userID, Perm.sudoWrite | Perm.sudoDelete);
 * ```
 */
function permToGetUser(
	/** This request's `APIResponse` object, or `undefined` if no response should be sent on error (i.e. if this is a page and not an API). */
	res: APIResponse,
	/** The user to check the perms of. */
	user: UserDocument | undefined,
	/** The potentially unsafe user ID of the user to get. */
	id: UnsafeObjectID,
	/**
	 * The perm or binary OR of perms to require.
	 *
	 * Examples: `Perm.sudoRead`, `Perm.sudoWrite | Perm.sudoDelete`
	 */
	perms: number
): Promise<{
	user: UserDocument,
	statusCode?: undefined
}>;

function permToGetUser(
	/** This request's `APIResponse` object, or `undefined` if no response should be sent on error (e.g. if this is a page and not an API). */
	res: APIResponse | undefined,
	/** The user to check the perms of. */
	user: UserDocument | undefined,
	/** The potentially unsafe user ID of the user to get. */
	id: UnsafeObjectID,
	/**
	 * The perm or binary OR of perms to require.
	 *
	 * Examples: `Perm.sudoRead`, `Perm.sudoWrite | Perm.sudoDelete`
	 */
	perms: number
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
	/** This request's `APIResponse` object, or `undefined` if no response should be sent on error (i.e. if this is a page and not an API). */
	res: APIResponse | undefined,
	/** The user to check the perms of. */
	user: UserDocument | undefined,
	/** The potentially unsafe user ID of the user to get. */
	id: UnsafeObjectID,
	/**
	 * The perm or bitwise OR of perms to require.
	 *
	 * Examples: `Perm.sudoRead`, `Perm.sudoWrite | Perm.sudoDelete`
	 */
	perms: number
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

		if (!user.permLevel) {
			if (res) {
				res.status(403).send({
					message: 'You have no permissions.'
				});
			} else {
				resolve({ statusCode: 403 });
			}
			return;
		}

		if (!(user.perms & perms)) {
			// The user does not have one of the `perms`.

			if (res) {
				res.status(403).send({
					message: 'You have insufficient permissions.',
					userPerms: user.perms,
					requiredPerms: perms
				});
			} else {
				resolve({ statusCode: 403 });
			}
			return;
		}

		const requestedUser = await getUserByUnsafeID(id, res);

		if (!requestedUser) {
			// If `res` is defined, `getUserByUnsafeID` will send an error response and never resolve, so this point would never be reached.

			resolve({ statusCode: 404 });
			return;
		}

		if (requestedUser.permLevel && user.permLevel >= requestedUser.permLevel) {
			// The user's `permLevel` is not low enough to allow the user to manage the requested user.

			if (res) {
				res.status(403).send({
					message: `Your permission level (${user.permLevel}) must be lower than the specified user's permission level (${requestedUser.permLevel}).`
				});
			} else {
				resolve({ statusCode: 403 });
			}
			return;
		}

		resolve({ user: requestedUser });
	});
}

/**
 * Authenticates the request and requires the authenticated user to have permission to get the user of ID `req.query.userID`, or by the `userID` argument if `req.query.userID` does not exist.
 *
 * Returns the other user if successful.
 *
 * Example:
 * ```
 * const user = await permToGetUserInAPI(req, res, Perm.sudoWrite);
 * const user = await permToGetUserInAPI(req, res, Perm.sudoWrite | Perm.sudoDelete);
 * const user = await permToGetUserInAPI(req, res, Perm.sudoWrite, req.body.user);
 * ```
 */
export const permToGetUserInAPI = async <UserID extends UnsafeObjectID = undefined>(
	req: APIRequest<{ query: { userID: UserID } } | {}>,
	res: APIResponse,
	/**
	 * The perm or binary OR of perms to require.
	 *
	 * Examples: `Perm.sudoRead`, `Perm.sudoWrite | Perm.sudoDelete`
	 */
	perms: number,
	...[
		userID = (req.query as any).userID
	]: (UserID extends undefined ? [
		userID: UnsafeObjectID
	] : [
		userID?: UnsafeObjectID
	])
) => (
	(await permToGetUser(
		res,
		(await authenticate(req, res)).user,
		userID,
		perms
	)).user
);

/**
 * Requires a user to have permission to get another user by potentially unsafe ID.
 *
 * Returns an object of the other user if successful, or an object of the HTTP error status code if not.
 *
 * Example:
 * ```
 * const { user, statusCode } = await permToGetUserInPage(req, params.userID, Perm.sudoRead);
 * const { user, statusCode } = await permToGetUserInPage(req, params.userID, Perm.sudoWrite | Perm.sudoDelete);
 * ```
 */
export const permToGetUserInPage = async (
	req: PageRequest,
	/** The potentially unsafe user ID of the user to get. */
	id: UnsafeObjectID,
	/**
	 * The perm or binary OR of perms to require.
	 *
	 * Examples: `Perm.sudoRead`, `Perm.sudoWrite | Perm.sudoDelete`
	 */
	perms: number
) => permToGetUser(undefined, req.user, id, perms);