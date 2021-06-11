import validate from './index.validate';
import type { APIHandler } from 'modules/server/api';
import type { RecursivePartial } from 'modules/types';
import { Perm } from 'modules/client/perms';
import type { UserID } from 'modules/server/users';
import users from 'modules/server/users';
import { flatten, safeObjectID } from 'modules/server/db';
import { mergeWith, uniqBy } from 'lodash';
import type { StoryDocument } from 'modules/server/stories';
import stories, { getPrivateStory, getPublicStory, getStoryByUnsafeID } from 'modules/server/stories';
import type { PrivateStory, PublicStory } from 'modules/client/stories';
import { StoryPrivacy } from 'modules/client/stories';
import { authenticate } from 'modules/server/auth';
import { overwriteArrays } from 'modules/client/utilities';

/** The keys of all `PrivateStory` properties which the client should be able to `PUT` into their `StoryDocument`. */
type PuttableStoryKey = 'title' | 'status' | 'privacy' | 'owner' | 'editors' | 'author' | 'description' | 'blurb' | 'icon' | 'banner' | 'style' | 'disableUserTheme' | 'tags' | 'commentsEnabled' | 'editorSettings' | 'colors' | 'quirks';

const Handler: APIHandler<{
	query: {
		storyID: string
	}
} & (
	{
		method: 'GET'
	} | {
		method: 'PUT',
		body: RecursivePartial<Pick<PrivateStory, PuttableStoryKey> & {
			willDelete?: boolean,
			anniversary: Omit<PrivateStory['anniversary'], 'changed'>,
			script: Pick<PrivateStory['script'], 'unverified'>
		}>
	}
), (
	{
		method: 'GET',
		body: PublicStory
	} | {
		method: 'PUT',
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

	// If this point is reached, `req.method === 'PUT'`.

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

	if (Object.keys(req.body).length) {
		const storyChanges: RecursivePartial<StoryDocument> = req.body as Omit<typeof req.body, 'willDelete' | 'owner' | 'editors'>;

		if ((
			!ownerPerms && (
				'anniversary' in storyChanges
				|| 'owner' in storyChanges
				|| 'editors' in storyChanges
			)
		) || (
			'willDelete' in storyChanges && !(
				story.owner.equals(user!._id)
				|| user!.perms & Perm.sudoDelete
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
						].map(safeObjectID).filter(Boolean) as UserID[],
						String
					)
				}
			}).map(
				newEditor => [newEditor._id.toString(), newEditor] as const
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
				unsafeUserID => unsafeUserID !== undefined && newEditors[unsafeUserID]._id
			).filter(Boolean) as UserID[];
		}

		await stories.updateOne({
			_id: story._id
		}, {
			...Object.keys(storyChanges).length && {
				$set: flatten(storyChanges)
			},
			...willDelete === false && {
				$unset: {
					willDelete: true
				}
			}
		});

		mergeWith(story, storyChanges, overwriteArrays);
	}

	res.send(getPrivateStory(story));
};

export default Handler;