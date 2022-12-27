import validate from './index.validate';
import type { APIHandler } from 'lib/server/api';
import Perm, { hasPerms } from 'lib/client/Perm';
import { permToGetUserInAPI } from 'lib/server/users/permToGetUser';
import users from 'lib/server/users';
import type { StoryPageID } from 'lib/server/stories';
import getStoryByUnsafeID from 'lib/server/stories/getStoryByUnsafeID';
import StoryPrivacy from 'lib/client/StoryPrivacy';

const Handler: APIHandler<{
	query: {
		userID: string,
		storyID: string
	}
} & (
	{
		method: 'DELETE'
	} | {
		method: 'GET'
	} | {
		method: 'PUT',
		body: StoryPageID
	}
), {
	method: 'GET',
	body: StoryPageID
}> = async (req, res) => {
	await validate(req, res);

	const user = await permToGetUserInAPI(
		req,
		res,
		req.method === 'PUT'
			? Perm.WRITE
			: req.method === 'DELETE'
				? Perm.DELETE
				: Perm.READ
	);

	const story = await getStoryByUnsafeID(req.query.storyID, res);

	if (req.method === 'PUT') {
		if (story.privacy === StoryPrivacy.Private) {
			res.status(403).send({
				message: 'The specified story is private.'
			});
			return;
		}

		if (!(req.body in story.pages)) {
			res.status(422).send({
				message: 'The specified page does not exist in the specified story.'
			});
			return;
		}

		await users.updateOne({
			_id: user._id
		}, {
			$set: {
				[`storySaves.${story._id}`]: req.body
			} as Record<`storySaves.${number}`, typeof req.body>
		});

		res.status(204).end();
		return;
	}

	req.method satisfies 'DELETE' | 'GET';

	if (!(story._id in user.storySaves)) {
		res.status(404).send({
			message: 'The specified story is not in your story saves.'
		});
		return;
	}

	if (req.method === 'DELETE') {
		await users.updateOne({
			_id: user._id
		}, {
			$unset: {
				[`storySaves.${story._id}`]: true
			}
		});

		res.status(204).end();
		return;
	}

	res.send(user.storySaves[story._id]);
};

export default Handler;
