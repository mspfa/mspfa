import validate from './index.validate';
import type { APIHandler } from 'lib/server/api';
import stories from 'lib/server/stories';
import getStoryByUnsafeID from 'lib/server/stories/getStoryByUnsafeID';
import authenticate from 'lib/server/auth/authenticate';
import { Perm } from 'lib/client/perms';
import { ObjectId } from 'mongodb';
import StoryPrivacy from 'lib/client/StoryPrivacy';
import type { ClientColor } from 'lib/client/colors';
import type { ServerColor } from 'lib/server/colors';
import { getClientColor } from 'lib/server/colors';

const Handler: APIHandler<{
	query: {
		storyID: string
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

	/** An `ObjectId` of `req.body.group`. */
	let colorGroupID: ObjectId | undefined;

	if ('group' in req.body) {
		try {
			colorGroupID = new ObjectId(req.body.group);
		} catch {
			res.status(400).send({
				message: 'The specified color group ID is invalid.'
			});
			return;
		}

		if (!story.colorGroups.some(({ id }) => id.equals(colorGroupID!))) {
			res.status(422).send({
				message: 'No color group was found with the specified ID.'
			});
			return;
		}
	}

	const serverColor: ServerColor = {
		id: new ObjectId(),
		...req.body,
		group: colorGroupID
	};
	if (serverColor.group === undefined) {
		delete serverColor.group;
	}

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