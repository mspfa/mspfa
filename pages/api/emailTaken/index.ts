import validate from './index.validate';
import type { APIHandler } from 'lib/server/api';
import type { EmailString } from 'lib/types';
import users from 'lib/server/users';

const Handler: APIHandler<{
	method: 'GET',
	query: {
		email: EmailString
	}
}, {
	body: {
		/** Whether the email is taken by an existing user. */
		taken: boolean
	}
}> = async (req, res) => {
	await validate(req, res);

	res.send({
		taken: !!await users.findOne({
			$or: [
				{ email: req.query.email },
				{ unverifiedEmail: req.query.email }
			]
		})
	});
};

export default Handler;