import validate from './index.validate';
import type { APIHandler } from 'lib/server/api';
import type { PublicStory } from 'lib/client/stories';
import { getUserByUnsafeID } from 'lib/server/users';
import { getPublicStoriesByEditor } from 'lib/server/stories';

const Handler: APIHandler<{
	query: {
		userID: string
	},
	method: 'GET'
}, {
	body: PublicStory[]
}> = async (req, res) => {
	await validate(req, res);

	const user = await getUserByUnsafeID(req.query.userID, res);

	res.send(await getPublicStoriesByEditor(user));
};

export default Handler;