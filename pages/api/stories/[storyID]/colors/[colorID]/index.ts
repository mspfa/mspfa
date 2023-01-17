import validate from './index.validate';
import type { APIHandler } from 'lib/server/api';
import type { ServerColor } from 'lib/server/colors';
import { getClientColor } from 'lib/server/colors';
import stories from 'lib/server/stories';
import getStoryByUnsafeID from 'lib/server/stories/getStoryByUnsafeID';
import authenticate from 'lib/server/auth/authenticate';
import type { ClientColor } from 'lib/client/colors';
import Perm, { hasPerms } from 'lib/client/Perm';
import StoryPrivacy from 'lib/client/StoryPrivacy';
import flatten from 'lib/server/db/flatten';
import parseID from 'lib/server/db/parseID';
import type { integer } from 'lib/types';
import stringifyID from 'lib/server/db/stringifyID';

/** The keys of all `ClientColor` properties which a client should be able to `PATCH` into a `ServerColor`. */
type WritableColorKey = 'name' | 'value' | 'group';

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
		body: Partial<Pick<ClientColor, WritableColorKey>> & {
			/** The index in the `colors` array to move the specified color to. */
			index?: integer
		}
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
		const color = story.colors.find(({ id }) => stringifyID(id) === req.query.colorID);

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
			const user = await authenticate(req, res);

			if (!(
				user && (
					story.owner.equals(user._id)
					|| story.editors.some(userID => userID.equals(user._id))
					|| hasPerms(user, Perm.READ)
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

	const user = await authenticate(req, res);

	if (req.method === 'DELETE') {
		if (!(
			user && (
				story.owner.equals(user._id)
				|| story.editors.some(userID => userID.equals(user._id))
				|| hasPerms(user, Perm.DELETE)
			)
		)) {
			res.status(403).send({
				message: 'You do not have permission to delete colors on the specified adventure.'
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

	req.method satisfies 'PATCH';

	if (!(
		user && (
			story.owner.equals(user._id)
			|| story.editors.some(userID => userID.equals(user._id))
			|| hasPerms(user, Perm.WRITE)
		)
	)) {
		res.status(403).send({
			message: 'You do not have permission to edit colors on the specified adventure.'
		});
		return;
	}

	const color = await getColor();

	const { index, group, ...colorChangesWithoutGroup } = req.body;

	const colorChanges: Partial<Pick<ServerColor, WritableColorKey>> = {
		...colorChangesWithoutGroup,
		...group === null && {
			group: null
		}
	};

	if (typeof req.body.group === 'string') {
		const colorGroupID = parseID(req.body.group);

		if (colorGroupID === undefined) {
			res.status(400).send({
				message: 'The specified color group ID is invalid.'
			});
			return;
		}

		if (!story.colorGroups.some(({ id }) => id.equals(colorGroupID))) {
			res.status(422).send({
				message: 'No color group was found with the specified ID.'
			});
			return;
		}

		colorChanges.group = colorGroupID;
	}

	Object.assign(color, colorChanges);

	if (index === undefined) {
		const colorChangesLength = Object.values(colorChanges).length;
		if (colorChangesLength) {
			await stories.updateOne({
				'_id': story._id,
				'colors.id': color.id
			}, {
				$set: flatten(colorChanges, 'colors.$.')
			});
		}
	} else {
		// Pull the outdated color from its original index.
		await stories.updateOne({
			_id: story._id
		}, {
			$pull: {
				colors: { id: color.id }
			}
		});

		// Push the updated color to the new index.
		await stories.updateOne({
			_id: story._id
		}, {
			$push: {
				colors: {
					$each: [color],
					// Clamp `index` to only valid indexes in the array.
					$position: Math.max(0, Math.min(story.colors.length - 1, index))
				}
			}
		});
	}

	res.send(getClientColor(color));
};

export default Handler;
