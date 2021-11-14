import validate from './index.validate';
import type { APIHandler } from 'lib/server/api';
import stories, { getStoryByUnsafeID } from 'lib/server/stories';
import { authenticate } from 'lib/server/auth';
import { Perm } from 'lib/client/perms';
import { ObjectId } from 'mongodb';
import { StoryPrivacy } from 'lib/client/stories';
import type { ClientColor } from 'lib/client/colors';
import type { ServerColor } from 'lib/server/colors';
import { getClientColor } from 'lib/server/colors';

const Handler: APIHandler<{
	query: {
		storyID: string,
		colorID: string
	}
} & (
	{
		method: 'POST',
		body: Omit<ClientColor, 'id'>
	} | {
		method: 'GET'
	}
), {
	method: 'POST',
	body: ClientColor
} | {
	method: 'GET',
	body: ClientColor[]
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

		res.send(story.colors.map(getClientColor));
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
			message: 'You do not have permission to edit the colors of the specified adventure.'
		});
		return;
	}

	const serverColor: ServerColor = {
		id: new ObjectId(),
		...req.body
	};

	await stories.updateOne({
		_id: story._id
	}, {
		$push: {
			colors: serverColor
		}
	});

	res.status(201).send(getClientColor(serverColor));
};

export default Handler;