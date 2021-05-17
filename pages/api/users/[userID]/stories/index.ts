import validate from './index.validate';
import type { APIHandler } from 'modules/server/api';
import type { PublicStory } from 'modules/client/stories';
import { getUserByUnsafeID } from 'modules/server/users';
import { getPublicStoriesByEditor } from 'modules/server/stories';

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