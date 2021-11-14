import validate from './index.validate';
import type { APIHandler } from 'lib/server/api';
import type { ServerColor } from 'lib/server/colors';
import { getClientColor } from 'lib/server/colors';
import stories, { getStoryByUnsafeID } from 'lib/server/stories';
import { authenticate } from 'lib/server/auth';
import type { ClientColor } from 'lib/client/colors';
import { Perm } from 'lib/client/perms';
import StoryPrivacy from 'lib/client/StoryPrivacy';
import type { RecursivePartial } from 'lib/types';
import { flatten } from 'lib/server/db';

/** The keys of all `ClientColor` properties which the client should be able to `PATCH` into their `ServerColor`. */
type WritableColorKey = 'name' | 'value';

const Handler: APIHandler<{
	query: {
		storyID: string,
		colorID: string
	}
} & (
	{
		method: 'GET'
	} | {
		method: 'DELETE'
	} | {
		method: 'PATCH',
		body: RecursivePartial<Pick<ClientColor, WritableColorKey>>
	}
), {
	method: 'GET',
	body: ClientColor
} | {
	method: 'DELETE'
} | {
	method: 'PATCH',
	body: ClientColor
}> = async (req, res) => {
	await validate(req, res);

	const story = await getStoryByUnsafeID(req.query.storyID, res);

	/** Gets the requested color. If the color doesn't exist, responds with an error and never resolves. */
	const getColor = () => new Promise<ServerColor>(resolve => {
		const color = story.colors.find(({ id }) => id.toString() === req.query.colorID);

		if (!color) {
			res.status(404).send({
				message: 'No color was found with the specified ID.'
			});
			return;
		}

		resolve(color);
	});

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

		res.send(getClientColor(await getColor()));
		return;
	}

	const { user } = await authenticate(req, res);

	if (req.method === 'DELETE') {
		if (!(
			user && (
				story.owner.equals(user._id)
				|| story.editors.some(userID => userID.equals(user._id))
				|| user.perms & Perm.sudoDelete
			)
		)) {
			res.status(403).send({
				message: 'You do not have permission to delete colors of the specified adventure.'
			});
			return;
		}

		await stories.updateOne({
			_id: story._id
		}, {
			$pull: {
				colors: {
					id: (await getColor()).id
				}
			}
		});

		res.status(204).end();
		return;
	}

	// If this point is reached, `req.method === 'PATCH'`.

	if (!(
		user && (
			story.owner.equals(user._id)
			|| story.editors.some(userID => userID.equals(user._id))
			|| user.perms & Perm.sudoWrite
		)
	)) {
		res.status(403).send({
			message: 'You do not have permission to edit colors on the specified adventure.'
		});
		return;
	}

	const color = await getColor();

	Object.assign(color, req.body);

	await stories.updateOne({
		'_id': story._id,
		'colors.id': color.id
	}, {
		$set: flatten(req.body, 'colors.$.')
	});

	res.send(getClientColor(color));
};

export default Handler;