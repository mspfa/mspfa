import validate from './index.validate';
import type { APIHandler } from 'modules/server/api';
import type { RecursivePartial } from 'modules/types';
import { Perm } from 'modules/client/perms';
import { permToGetUserInAPI } from 'modules/server/perms';
import type { UserID } from 'modules/server/users';
import users from 'modules/server/users';
import { flatten, safeObjectID } from 'modules/server/db';
import { mergeWith, uniqBy } from 'lodash';
import type { StoryDocument } from 'modules/server/stories';
import stories, { getPrivateStory, getPublicStory, getStoryByUnsafeID } from 'modules/server/stories';
import type { PrivateStory, PublicStory } from 'modules/client/stories';
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
		method: 'DELETE'
	} | {
		method: 'PUT',
		body: RecursivePartial<Pick<PrivateStory, PuttableStoryKey> & {
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

	const story = await getStoryByUnsafeID(req.query.storyID, res);

	if (req.method === 'GET') {
		res.send(getPublicStory(story));
		return;
	}

	if (req.method === 'PUT') {
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
			const storyChanges: RecursivePartial<StoryDocument> = req.body as Omit<typeof req.body, 'owner' | 'editors'>;

			if (!ownerPerms && (
				'anniversary' in storyChanges
				|| 'owner' in storyChanges
				|| 'editors' in storyChanges
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

			/** An object that maps this request's unsafe user IDs to their safe counterparts, excluding IDs for which there is no user found. */
			const userIDs = Object.fromEntries(
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
					({ _id }) => [_id.toString(), _id] as const
				).toArray()
			);

			if (req.body.owner !== undefined) {
				storyChanges.owner = userIDs[req.body.owner];
			}

			if (req.body.editors) {
				storyChanges.editors = req.body.editors.map(
					unsafeUserID => unsafeUserID !== undefined && userIDs[unsafeUserID]
				).filter(Boolean) as UserID[];
			}

			await stories.updateOne({
				_id: story._id
			}, {
				$set: flatten(storyChanges)
			});

			mergeWith(story, storyChanges, overwriteArrays);
		}

		res.send(getPrivateStory(story));
		return;
	}

	// If this point is reached, `req.method === 'DELETE'`.

	await permToGetUserInAPI(req, res, Perm.sudoDelete, story.owner);

	await users.updateMany({
		favs: story._id
	}, {
		$pull: {
			favs: story._id
		}
	});

	await stories.deleteOne({
		_id: story._id
	});

	res.end();
};

export default Handler;