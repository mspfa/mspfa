import validate from './index.validate';
import type { APIHandler } from 'modules/server/api';
import type { StoryDocument } from 'modules/server/stories';
import stories from 'modules/server/stories';
import { authenticate } from 'modules/server/auth';
import { defaultStory } from 'modules/client/stories';

const Handler: APIHandler<{
	method: 'POST',
	body: {
		title: StoryDocument['title']
	}
}, {
	method: 'POST',
	body: ClientStory
}> = async (req, res) => {
	await validate(req, res);

	const { user } = await authenticate(req, res);

	if (!user) {
		res.status(403).send({
			message: 'You must be signed in to create an adventure.'
		});
		return;
	}

	const now = new Date();

	const story: StoryDocument = {
		...defaultStory,
		_id: 0,
		created: now,
		updated: now,
		title: req.body.title,
		owner: user._id.toString(),
		editors: []
	};

	await stories.insertOne(story);

	res.status(201).send(getClientStory(story));
};

export default Handler;