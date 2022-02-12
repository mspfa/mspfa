import validate from './index.validate';
import type { APIHandler } from 'lib/server/api';
import type { ServerColorGroup } from 'lib/server/colors';
import { getClientColorGroup } from 'lib/server/colors';
import stories from 'lib/server/stories';
import getStoryByUnsafeID from 'lib/server/stories/getStoryByUnsafeID';
import authenticate from 'lib/server/auth/authenticate';
import type { ClientColorGroup } from 'lib/client/colors';
import { Perm } from 'lib/client/perms';
import StoryPrivacy from 'lib/client/StoryPrivacy';
import flatten from 'lib/server/db/flatten';
import type { integer } from 'lib/types';
import stringifyID from 'lib/server/db/stringifyID';

/** The keys of all `ClientColorGroup` properties which a client should be able to `PATCH` into a `ServerColorGroup`. */
type WritableColorGroupKey = 'name';

const Handler: APIHandler<{
	query: {
		storyID: string,
		colorGroupID: string
	}
} & (
	{
		method: 'GET'
	} | {
		method: 'DELETE'
	} | {
		method: 'PATCH',
		body: Partial<Pick<ClientColorGroup, WritableColorGroupKey>> & {
			/** The position in the `colorGroups` array to move the specified color group to. */
			position?: integer
		}
	}
), {
	method: 'GET',
	body: ClientColorGroup
} | {
	method: 'DELETE'
} | {
	method: 'PATCH',
	body: ClientColorGroup
}> = async (req, res) => {
	await validate(req, res);

	const story = await getStoryByUnsafeID(req.query.storyID, res);

	/** Gets the requested color group. If the color group doesn't exist, responds with an error and never resolves. */
	const getColorGroup = () => new Promise<ServerColorGroup>(resolve => {
		const colorGroup = story.colorGroups.find(({ id }) => stringifyID(id) === req.query.colorGroupID);

		if (!colorGroup) {
			res.status(404).send({
				message: 'No color group was found with the specified ID.'
			});
			return;
		}

		resolve(colorGroup);
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

		res.send(getClientColorGroup(await getColorGroup()));
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
				message: 'You do not have permission to delete color groups on the specified adventure.'
			});
			return;
		}

		const colorGroup = await getColorGroup();

		await stories.updateOne({
			_id: story._id
		}, {
			$pull: {
				colorGroups: {
					id: colorGroup.id
				}
			},
			// Remove this color group from any colors that have it.
			$unset: {
				'colors.$[color].group': true
			}
		}, {
			arrayFilters: [
				{ 'color.group': colorGroup.id }
			]
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
			message: 'You do not have permission to edit color groups on the specified adventure.'
		});
		return;
	}

	const colorGroup = await getColorGroup();

	const colorGroupChanges: Partial<ServerColorGroup> & Pick<typeof req.body, 'position'> = {
		...req.body
	};
	// Delete the `position` property from `colorGroupChanges` since it isn't a real property of `ServerColorGroup`s.
	delete colorGroupChanges.position;

	Object.assign(colorGroup, colorGroupChanges);

	if (req.body.position === undefined) {
		if (Object.values(colorGroupChanges).length) {
			await stories.updateOne({
				'_id': story._id,
				'colorGroups.id': colorGroup.id
			}, {
				$set: flatten(colorGroupChanges, 'colorGroups.$.')
			});
		}
	} else {
		// Pull the outdated color group from its original position.
		await stories.updateOne({
			_id: story._id
		}, {
			$pull: {
				colorGroups: { id: colorGroup.id }
			}
		});

		// Push the updated color group to the new position.
		await stories.updateOne({
			_id: story._id
		}, {
			$push: {
				colorGroups: {
					$each: [colorGroup],
					// Clamp `req.body.position` to only valid indexes in the array.
					$position: Math.max(0, Math.min(story.colorGroups.length - 1, req.body.position))
				}
			}
		});
	}

	res.send(getClientColorGroup(colorGroup));
};

export default Handler;