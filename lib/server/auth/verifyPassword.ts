import argon2 from 'argon2';
import type { APIResponse } from 'lib/server/api';
import type { ServerUser } from 'lib/server/users';
import type { integer } from 'lib/types';

export enum VerifyPasswordResult {
	NotFound,
	Correct,
	Incorrect
}

const verifyPassword = (
	res: APIResponse,
	/** The user to verify the password of. */
	user: ServerUser,
	/** The user-inputted password to verify. */
	password: string,
	/**
	 * A partial record that maps `VerifyPasswordResult` keys to HTTP status code values.
	 *
	 * If a status code value is 0, its corresponding `VerifyPasswordResult` key will resolve this promise rather than sending an HTTP error.
	 */
	status: Partial<Record<Exclude<VerifyPasswordResult, VerifyPasswordResult.Correct>, integer>> = {}
) => new Promise<VerifyPasswordResult>(async resolve => {
	let result = VerifyPasswordResult.NotFound;

	for (const authMethod of user.authMethods) {
		if (authMethod.type === 'password') {
			result = VerifyPasswordResult.Incorrect;

			if (await argon2.verify(authMethod.value, password)) {
				result = VerifyPasswordResult.Correct;
				break;
			}
		}
	}

	if (result === VerifyPasswordResult.NotFound) {
		const resultStatus = status[VerifyPasswordResult.NotFound] ?? 404;

		if (resultStatus !== 0) {
			res.status(resultStatus).send({
				message: 'The specified user does not use a password to sign in.'
			});
			return;
		}
	}

	if (result === VerifyPasswordResult.Incorrect) {
		const resultStatus = status[VerifyPasswordResult.NotFound] ?? 403;

		if (resultStatus !== 0) {
			res.status(resultStatus).send({
				message: 'The specified password is incorrect.'
			});
			return;
		}
	}

	resolve(result);
});

export default verifyPassword;