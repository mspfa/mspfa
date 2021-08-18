import validate from './index.validate';
import type { APIHandler } from 'lib/server/api';
import type { ServerNews } from 'lib/server/news';
import { getClientNews } from 'lib/server/news';
import stories, { getStoryByUnsafeID } from 'lib/server/stories';
import { authenticate } from 'lib/server/auth';
import type { ClientNews } from 'lib/client/news';
import { Perm } from 'lib/client/perms';
import { ObjectId } from 'mongodb';

const Handler: APIHandler<{
	query: {
		storyID: string
	},
	method: 'POST',
	body: Pick<ClientNews, 'content'>
}, {
	method: 'POST',
	body: ClientNews
}> = async (req, res) => {
	await validate(req, res);

	const story = await getStoryByUnsafeID(req.query.storyID, res);

	const { user } = await authenticate(req, res);

	if (!(
		user && (
			story.owner.equals(user._id)
			|| story.editors.some(userID => userID.equals(user._id))
			|| user.perms & Perm.sudoWrite
		)
	)) {
		res.status(403).send({
			message: 'You do not have permission to post news to the specified adventure.'
		});
		return;
	}

	const serverNews: ServerNews = {
		id: new ObjectId(),
		posted: new Date(),
		author: user._id,
		content: req.body.content
	};

	await stories.updateOne({
		_id: story._id
	}, {
		$push: {
			news: serverNews
		}
	});

	res.status(201).send(getClientNews(serverNews));
};

export default Handler;