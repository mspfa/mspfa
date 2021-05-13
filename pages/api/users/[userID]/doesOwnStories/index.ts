import validate from './index.validate';
import type { APIHandler } from 'modules/server/api';
import { getUserByUnsafeID } from 'modules/server/users';
import stories from 'modules/server/stories';

const Handler: APIHandler<{
	query: {
		userID: string
	},
	method: 'GET'
}, {
	body: boolean
}> = async (req, res) => {
	await validate(req, res);

	const user = await getUserByUnsafeID(req.query.userID);

	if (!user) {
		res.status(404).send({
			message: 'No user was found with the specified ID.'
		});
		return;
	}

	res.send(
		!!stories.findOne({
			owner: user._id
		})
	);
};

export default Handler;