import getUserByUnsafeID from 'lib/server/users/getUserByUnsafeID';
import type { ServerUser } from 'lib/server/users';
import type { APIRequest, APIResponse } from 'lib/server/api';
import type { PageRequest } from 'lib/server/pages';
import authenticate from 'lib/server/auth/authenticate';
import type { integer } from 'lib/types';
import stringifyID from 'lib/server/db/stringifyID';

type PermToGetUserRequiredParams = [
	/** The user to check the perms of. */
	user: ServerUser | undefined,
	/** The potentially unsafe user ID of the user to get. */
	id: string | undefined,
	/**
	 * The perm or bitwise OR of perms to require.
	 *
	 * Examples: `Perm.sudoRead`, `Perm.sudoWrite | Perm.sudoDelete`
	 */
	perms: integer
];

type PermToGetUserReturn<Res> = {
	user: ServerUser,
	statusCode?: never
} | (
	undefined extends Res ? {
		user?: undefined,
		statusCode: integer
	} : never
);

/**
 * Requires `user` to have permission to get another user by potentially unsafe `id`.
 *
 * Returns a promise which either:
 * * Resolves with an object of the requested user by if the `user` is requesting themself or if `user` has at least one of the specified `perms`.
 * * Does not resolve and sends an HTTP error response if there is an error and an `APIResponse` is provided.
 * * Resolves with an object of the error's status code if there is an error and no `APIResponse` is provided.
 */
const permToGetUser = <Res extends APIResponse<any> | undefined>(
	...[user, id, perms, res]: PermToGetUserRequiredParams | [
		...requiredParams: PermToGetUserRequiredParams,
		/** This request's `APIResponse` object, or `undefined` if no response should be sent on error (i.e. if this is a page and not an API). */
		res: Res
		// It is necessary to use tuple types instead of simply having `res` be an optional parameter, because otherwise `Res` will not always be inferred correctly.
	]
) => new Promise<PermToGetUserReturn<Res>>(async resolve => {
	if (!user) {
		// The client is not authenticated.

		if (res) {
			res.status(403).send({
				message: 'You are not authenticated.'
			});
		} else {
			resolve({ statusCode: 403 } as PermToGetUserReturn<Res>);
		}
		return;
	}

	if (id && stringifyID(user._id) === stringifyID(id)) {
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
			resolve({ statusCode: 403 } as PermToGetUserReturn<Res>);
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
			resolve({ statusCode: 403 } as PermToGetUserReturn<Res>);
		}
		return;
	}

	const requestedUser = await getUserByUnsafeID(id);

	if (!requestedUser) {
		// If `res` is defined, `getUserByUnsafeID` will send an error response and never resolve, so this point would never be reached.

		resolve({ statusCode: 404 } as PermToGetUserReturn<Res>);
		return;
	}

	if (requestedUser.permLevel && user.permLevel >= requestedUser.permLevel) {
		// The user's `permLevel` is not low enough to allow the user to manage the requested user.

		if (res) {
			res.status(403).send({
				message: `Your permission level (${user.permLevel}) must be lower than the specified user's permission level (${requestedUser.permLevel}).`
			});
		} else {
			resolve({ statusCode: 403 } as PermToGetUserReturn<Res>);
		}
		return;
	}

	resolve({ user: requestedUser });
});

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
export const permToGetUserInAPI = async <UserID extends string | undefined = undefined>(
	req: APIRequest<{ query: { userID: UserID } } | {}>,
	res: APIResponse,
	/**
	 * The perm or bitwise OR of perms to require.
	 *
	 * Examples: `Perm.sudoRead`, `Perm.sudoWrite | Perm.sudoDelete`
	 */
	perms: integer,
	...[
		userID = (req.query as any).userID
	]: (UserID extends undefined ? [
		userID: string | undefined
	] : [
		userID?: string | undefined
	])
) => (
	(await permToGetUser(
		(await authenticate(req, res)).user,
		userID,
		perms,
		res
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
	id: string | undefined,
	/**
	 * The perm or bitwise OR of perms to require.
	 *
	 * Examples: `Perm.sudoRead`, `Perm.sudoWrite | Perm.sudoDelete`
	 */
	perms: integer
) => permToGetUser(req.user, id, perms);