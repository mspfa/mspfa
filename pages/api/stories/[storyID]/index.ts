import validate from './index.validate';
import type { APIHandler } from 'lib/server/api';
import type { RecursivePartial } from 'lib/types';
import { Perm } from 'lib/client/perms';
import type { ServerUserID } from 'lib/server/users';
import users from 'lib/server/users';
import flatten from 'lib/server/db/flatten';
import parseID from 'lib/server/db/parseID';
import { mergeWith, uniqBy } from 'lodash';
import type { ServerStory } from 'lib/server/stories';
import stories, { getPrivateStory, getPublicStory } from 'lib/server/stories';
import getStoryByUnsafeID from 'lib/server/stories/getStoryByUnsafeID';
import type { PrivateStory, PublicStory } from 'lib/client/stories';
import StoryPrivacy from 'lib/client/StoryPrivacy';
import authenticate from 'lib/server/auth/authenticate';
import overwriteArrays from 'lib/client/overwriteArrays';
import stringifyID from 'lib/server/db/stringifyID';

/** The keys of all `PrivateStory` properties which a client should be able to `PATCH` into a `ServerStory`. */
type WritableStoryKey = 'title' | 'status' | 'privacy' | 'owner' | 'editors' | 'author' | 'description' | 'icon' | 'banner' | 'style' | 'tags' | 'allowComments' | 'sidebarContent' | 'defaultPageTitle';

const Handler: APIHandler<{
	query: {
		storyID: string
	}
} & (
	{
		method: 'GET'
	} | {
		method: 'PATCH',
		body: RecursivePartial<Pick<PrivateStory, WritableStoryKey> & {
			willDelete: boolean,
			anniversary: Pick<PrivateStory['anniversary'], 'year' | 'month' | 'day'>,
			script: Pick<PrivateStory['script'], 'unverified'>
		}>
	}
), (
	{
		method: 'GET',
		body: PublicStory
	} | {
		method: 'PATCH',
		body: PrivateStory
	}
)> = async (req, res) => {
	await validate(req, res);

	const story = await getStoryByUnsafeID(req.query.storyID, res, true);

	if (req.method === 'GET') {
		if (story.willDelete || story.privacy === StoryPrivacy.Private) {
			const { user } = await authenticate(req, res);

			if (!(
				user && (
					story.owner.equals(user._id)
					|| (
						story.editors.some(userID => userID.equals(user._id))
						// Only owners can access their deleted stories.
						&& !story.willDelete
					)
					|| user.perms & Perm.sudoRead
				)
			)) {
				res.status(403).send({
					message: 'You do not have permission to access the specified adventure.'
				});
				return;
			}
		}

		res.send(getPublicStory(story));
		return;
	}

	// If this point is reached, `req.method === 'PATCH'`.

	const { user } = await authenticate(req, res);

	const ownerPerms = !!(
		user && (
			story.owner.equals(user._id)
			|| user.perms & Perm.sudoWrite
		)
	);

	if (!(
		ownerPerms || (
			user
			&& story.editors.some(userID => userID.equals(user._id))
		)
	)) {
		res.status(403).send({
			message: 'You do not have permission to edit the specified adventure.'
		});
		return;
	}

	if (Object.values(req.body).length) {
		const storyChanges: RecursivePartial<ServerStory> = req.body as Omit<typeof req.body, 'willDelete' | 'owner' | 'editors'>;

		if ((
			!ownerPerms && (
				'anniversary' in storyChanges
				|| 'owner' in storyChanges
				|| 'editors' in storyChanges
			)
		) || (
			'willDelete' in storyChanges && !(
				story.owner.equals(user._id)
				|| user.perms & Perm.sudoDelete
			)
		)) {
			res.status(403).send({
				message: 'You do not have permission to edit all specified properties of the specified adventure.'
			});
			return;
		}

		if (storyChanges.anniversary) {
			if (story.anniversary.changed) {
				res.status(403).send({
					message: 'You can only change an adventure\'s anniversary date once.'
				});
				return;
			}

			storyChanges.anniversary.changed = true;
		}

		// `willDelete` must be stored in a variable here, or else it will be removed from `req.body` if it is deleted from `storyChanges`.
		const { willDelete } = req.body;

		if (willDelete !== undefined) {
			if (willDelete) {
				storyChanges.willDelete = new Date(Date.now() + 1000 * 60 * 60 * 24 * 30);
			} else {
				delete storyChanges.willDelete;
				delete story.willDelete;
			}
		}

		/** An object that maps this request's unsafe user IDs to their safe counterparts, excluding IDs for which there is no user found. */
		const newEditors = Object.fromEntries(
			await users.find!({
				_id: {
					$in: uniqBy(
						[
							...req.body.owner ? [req.body.owner] : [],
							...req.body.editors ? req.body.editors : []
						].map(parseID).filter(Boolean) as ServerUserID[],
						String
					)
				}
			}).map(
				newEditor => [stringifyID(newEditor._id), newEditor] as const
			).toArray()
		);

		if (req.body.owner !== undefined) {
			const newOwner = newEditors[req.body.owner];

			if (newOwner.willDelete === undefined) {
				storyChanges.owner = newEditors[req.body.owner]._id;
			} else {
				// If the new owner specified in `req.body` is invalid (because the user is deleted), remove it from `storyChanges` (as `req.body` was originally assigned to `storyChanges`).
				delete storyChanges.owner;
			}
		}

		if (req.body.editors) {
			storyChanges.editors = req.body.editors.map(
				unsafeUserID => newEditors[unsafeUserID]._id
			);
		}

		const storyChangesLength = Object.values(storyChanges).length;

		// Only update the database if the update wouldn't be empty.
		if (
			storyChangesLength
			|| willDelete === false
		) {
			await stories.updateOne({
				_id: story._id
			}, {
				...storyChangesLength && {
					$set: flatten(storyChanges)
				},
				...willDelete === false && {
					$unset: {
						willDelete: true
					}
				}
			});
		}

		mergeWith(story, storyChanges, overwriteArrays);
	}

	res.send(getPrivateStory(story));
};

export default Handler;