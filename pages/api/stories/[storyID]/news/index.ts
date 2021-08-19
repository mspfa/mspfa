import validate from './index.validate';
import type { APIHandler } from 'lib/server/api';
import type { ServerNews } from 'lib/server/news';
import { getClientNews } from 'lib/server/news';
import stories, { getStoryByUnsafeID } from 'lib/server/stories';
import { authenticate } from 'lib/server/auth';
import type { ClientNews } from 'lib/client/news';
import { Perm } from 'lib/client/perms';
import { ObjectId } from 'mongodb';
import type { integer } from 'lib/types';
import type { PublicUser } from 'lib/client/users';
import { StoryPrivacy } from 'lib/client/stories';
import users, { getPublicUser } from 'lib/server/users';
import { uniqBy } from 'lodash';

const Handler: APIHandler<{
	// TODO: Same as other instance of `query: unknown &`.
	query: unknown & {
		storyID: string
	}
} & (
	{
		method: 'POST',
		body: Pick<ClientNews, 'content'>
	} | {
		method: 'GET',
		query: {
			/** How many results to respond with. */
			limit?: integer | string,
			/** Filter the results to only include news posted before the news with this ID. */
			before?: string
		}
	}
), {
	method: 'POST',
	body: ClientNews
} | {
	method: 'GET',
	body: {
		news: ClientNews[],
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
					message: 'You do not have permission to access the news of the specified adventure.'
				});
				return;
			}
		}

		let limit = req.query.limit ? +req.query.limit : NaN;

		if (Number.isNaN(limit) || limit > 50) {
			limit = 50;
		}

		const startIndex = (
			req.query.before
				? story.news.findIndex(
					({ id }) => id.toString() === req.query.before
				) + 1
				: 0
		);

		const newsPosts = story.news.slice(startIndex, startIndex + limit);

		res.send({
			news: newsPosts.map(getClientNews),
			userCache: await users.find!({
				_id: {
					$in: uniqBy(newsPosts.map(({ author }) => author), String)
				},
				willDelete: { $exists: false }
			}).map(getPublicUser).toArray()
		});
		return;
	}

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

	const serverNews: ServerNews = {
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

	res.status(201).send(getClientNews(serverNews));
};

export default Handler;