import validate from './index.validate';
import type { APIHandler } from 'lib/server/api';
import stories from 'lib/server/stories';
import getStoryByUnsafeID from 'lib/server/stories/getStoryByUnsafeID';
import authenticate from 'lib/server/auth/authenticate';
import { Perm } from 'lib/client/perms';
import { ObjectId } from 'mongodb';
import StoryPrivacy from 'lib/client/StoryPrivacy';
import type { ClientColorGroup } from 'lib/client/colors';
import type { ServerColorGroup } from 'lib/server/colors';
import { getClientColorGroup } from 'lib/server/colors';

const Handler: APIHandler<{
	query: {
		storyID: string
	}
} & (
	{
		method: 'POST',
		body: Omit<ClientColorGroup, 'id'>
	} | {
		method: 'GET'
	}
), {
	method: 'POST',
	body: ClientColorGroup
} | {
	method: 'GET',
	body: ClientColorGroup[]
}> = async (req, res) => {
	await validate(req, res);

	const story = await getStoryByUnsafeID(req.query.storyID, res);

	if (req.method === 'GET') {
		if (story.privacy === StoryPrivacy.Private) {
			const { user } = await authenticate(req, res);

			if (!(
				user && (
					story.owner.equals(user._id)
					|| story.editors.some(userID => userID.equals(user._id))
					|| user.perms & Perm.sudoRead
				)
			)) {
				res.status(403).send({
					message: 'You do not have permission to access the specified adventure.'
				});
				return;
			}
		}

		res.send(story.colorGroups.map(getClientColorGroup));
		return;
	}

	// If this point is reached, `req.method === 'POST'`.

	const { user } = await authenticate(req, res);

	if (!(
		user && (
			story.owner.equals(user._id)
			|| story.editors.some(userID => userID.equals(user._id))
			|| user.perms & Perm.sudoWrite
		)
	)) {
		res.status(403).send({
			message: 'You do not have permission to edit the color groups of the specified adventure.'
		});
		return;
	}

	const serverColorGroup: ServerColorGroup = {
		id: new ObjectId(),
		...req.body
	};

	await stories.updateOne({
		_id: story._id
	}, {
		$push: {
			colorGroups: serverColorGroup
		}
	});

	res.status(201).send(getClientColorGroup(serverColorGroup));
};

export default Handler;