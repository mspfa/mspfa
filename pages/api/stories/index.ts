import validate from './index.validate';
import type { APIHandler } from 'lib/server/api';
import type { ServerStory } from 'lib/server/stories';
import stories, { defaultStory, getPrivateStory } from 'lib/server/stories';
import { authenticate } from 'lib/server/auth';
import type { PrivateStory } from 'lib/client/stories';
import { connection } from 'lib/server/db';

const Handler: APIHandler<{
	method: 'POST',
	body: Pick<ServerStory, 'title'>
}, {
	method: 'POST',
	body: PrivateStory
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

	await connection;

	const storyID = 1 + (
		(
			// The story with the largest ID.
			await stories.aggregate!([
				{ $sort: { _id: -1 } },
				{ $limit: 1 }
			]).next()
		)?._id || 0
	);
	const story: ServerStory = {
		...defaultStory,
		_id: storyID,
		created: now,
		anniversary: {
			year: now.getFullYear(),
			month: now.getMonth(),
			day: now.getDate(),
			changed: false
		},
		updated: now,
		title: req.body.title,
		owner: user._id,
		editors: [user._id]
	};

	await stories.insertOne(story);

	res.status(201).send(getPrivateStory(story));
};

export default Handler;