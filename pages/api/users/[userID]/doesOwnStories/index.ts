import validate from './index.validate';
import type { APIHandler } from 'lib/server/api';
import getUserByUnsafeID from 'lib/server/users/getUserByUnsafeID';
import stories from 'lib/server/stories';

const Handler: APIHandler<{
	query: {
		userID: string
	},
	method: 'GET'
}, {
	body: boolean
}> = async (req, res) => {
	await validate(req, res);

	const user = await getUserByUnsafeID(req.query.userID, res);

	res.send(
		!!await stories.findOne({
			owner: user._id,
			willDelete: { $exists: false }
		})
	);
};

export default Handler;