import validate from './index.validate';
import type { APIHandler } from 'lib/server/api';
import type { ServerNewsPost } from 'lib/server/news';
import { getClientNewsPost } from 'lib/server/news';
import stories, { getStoryByUnsafeID } from 'lib/server/stories';
import { authenticate } from 'lib/server/auth';
import type { ClientNewsPost } from 'lib/client/news';
import { Perm } from 'lib/client/perms';
import { StoryPrivacy } from 'lib/client/stories';
import type { RecursivePartial } from 'lib/types';
import { flatten } from 'lib/server/db';

/** The keys of all `ClientNewsPost` properties which the client should be able to `PATCH` into their `ServerNewsPost`. */
type WritableNewsPostKey = 'content';

const Handler: APIHandler<{
	query: {
		storyID: string,
		newsPostID: string
	}
} & (
	{
		method: 'GET'
	} | {
		method: 'DELETE'
	} | {
		method: 'PATCH',
		body: RecursivePartial<Pick<ClientNewsPost, WritableNewsPostKey>>
	}
), {
	method: 'GET',
	body: ClientNewsPost
} | {
	method: 'DELETE'
} | {
	method: 'PATCH',
	body: ClientNewsPost
}> = async (req, res) => {
	await validate(req, res);

	const story = await getStoryByUnsafeID(req.query.storyID, res);

	/** Gets the requested news post. If the news post doesn't exist, responds with an error and never resolves. */
	const getNewsPost = () => new Promise<ServerNewsPost>(resolve => {
		const newsPost = story.news.find(({ id }) => id.toString() === req.query.newsPostID);

		if (!newsPost) {
			res.status(404).send({
				message: 'No news post was found with the specified ID.'
			});
			return;
		}

		resolve(newsPost);
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

		res.send(getClientNewsPost(await getNewsPost()));
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
				message: 'You do not have permission to delete news on the specified adventure.'
			});
			return;
		}

		await stories.updateOne({
			_id: story._id
		}, {
			$pull: {
				news: {
					id: (await getNewsPost()).id
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
			message: 'You do not have permission to edit news on the specified adventure.'
		});
		return;
	}

	const newsPost = await getNewsPost();

	const newsPostMerge: Partial<ServerNewsPost> = {
		...req.body,
		edited: new Date()
	};

	Object.assign(newsPost, newsPostMerge);

	await stories.updateOne({
		'_id': story._id,
		'news.id': newsPost.id
	}, {
		$set: flatten(newsPostMerge, 'news.$.')
	});

	res.send(getClientNewsPost(newsPost));
};

export default Handler;