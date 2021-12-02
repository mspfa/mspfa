import validate from './index.validate';
import type { APIHandler } from 'lib/server/api';
import type { ServerNewsPost } from 'lib/server/news';
import { getClientNewsPost } from 'lib/server/news';
import stories from 'lib/server/stories';
import getStoryByUnsafeID from 'lib/server/stories/getStoryByUnsafeID';
import authenticate from 'lib/server/auth/authenticate';
import type { ClientNewsPost } from 'lib/client/news';
import { Perm } from 'lib/client/perms';
import { ObjectId } from 'mongodb';
import type { integer } from 'lib/types';
import type { PublicUser } from 'lib/client/users';
import StoryPrivacy from 'lib/client/StoryPrivacy';
import users, { getPublicUser } from 'lib/server/users';
import { uniqBy } from 'lodash';

const Handler: APIHandler<{
	// TODO: Same as other instances of `query: unknown &`.
	query: unknown & {
		storyID: string
	}
} & (
	{
		method: 'POST',
		body: Pick<ClientNewsPost, 'content'>
	} | {
		method: 'GET',
		query: {
			/** How many results to respond with. */
			limit?: integer | string,
			/** Filter the results to only include news after the news post with this ID. */
			after?: string
		}
	}
), {
	method: 'POST',
	body: ClientNewsPost
} | {
	method: 'GET',
	body: {
		news: ClientNewsPost[],
		userCache: PublicUser[]
	}
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

		let limit = req.query.limit ? +req.query.limit : NaN;

		if (Number.isNaN(limit) || limit > 50) {
			limit = 50;
		}

		/** An `ObjectId` of `req.query.after`, or undefined if none was specified. */
		let afterID: ObjectId | undefined = undefined;

		if (req.query.after) {
			try {
				afterID = new ObjectId(req.query.after);
			} catch {
				res.status(400).send({
					message: 'The news post ID in the specified `after` query is invalid.'
				});
				return;
			}
		}

		const startIndex = (
			afterID
				? story.news.findIndex(
					({ id }) => id.equals(afterID!)
				) + 1
				: 0
		);

		const newsPosts = story.news.slice(startIndex, startIndex + limit);

		res.send({
			news: newsPosts.map(getClientNewsPost),
			userCache: await users.find!({
				_id: {
					$in: uniqBy(newsPosts.map(({ author }) => author), String)
				},
				willDelete: { $exists: false }
			}).map(getPublicUser).toArray()
		});
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
			message: 'You do not have permission to post news to the specified adventure.'
		});
		return;
	}

	const serverNews: ServerNewsPost = {
		id: new ObjectId(),
		posted: new Date(),
		author: user._id,
		content: req.body.content
	};

	await stories.updateOne({
		_id: story._id
	}, {
		$push: {
			news: {
				$each: [serverNews],
				// Push to the start of the array, since the `news` array should always be sorted from newest to oldest.
				$position: 0
			}
		}
	});

	res.status(201).send(getClientNewsPost(serverNews));
};

export default Handler;