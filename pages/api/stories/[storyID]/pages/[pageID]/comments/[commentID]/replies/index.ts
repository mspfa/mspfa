import validate from './index.validate';
import type { APIHandler } from 'lib/server/api';
import type { ServerCommentReply } from 'lib/server/comments';
import { getClientCommentReply } from 'lib/server/comments';
import type { ServerStoryPage } from 'lib/server/stories';
import stories from 'lib/server/stories';
import getStoryByUnsafeID from 'lib/server/stories/getStoryByUnsafeID';
import authenticate from 'lib/server/auth/authenticate';
import type { ClientCommentReply } from 'lib/client/comments';
import { Perm } from 'lib/client/perms';
import { ObjectId } from 'mongodb';
import StoryPrivacy from 'lib/client/StoryPrivacy';
import type { integer } from 'lib/types';
import type { PublicUser } from 'lib/client/users';
import users, { getPublicUser } from 'lib/server/users';
import { uniqBy } from 'lodash';
import stringifyID from 'lib/server/db/stringifyID';

const Handler: APIHandler<{
	// TODO: Same as other instances of `query: unknown &`.
	query: unknown & {
		storyID: string,
		pageID: string,
		commentID: string
	}
} & (
	{
		method: 'GET',
		query: {
			/** How many results to respond with. */
			limit?: integer | string,
			/** Filter the results to only include comment replies after the comment reply with this ID. */
			after?: string
		}
	} | {
		method: 'POST',
		body: Pick<ClientCommentReply, 'content'>
	}
), {
	method: 'GET',
	body: {
		comments: ClientCommentReply[],
		userCache: PublicUser[]
	}
} | {
	method: 'POST',
	body: ClientCommentReply
}> = async (req, res) => {
	await validate(req, res);

	const story = await getStoryByUnsafeID(req.query.storyID, res);

	const { user } = await authenticate(req, res);

	if (story.privacy === StoryPrivacy.Private && !(
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

	if (!story.allowComments) {
		res.status(403).send({
			message: 'Comments are disabled on the specified adventure.'
		});
		return;
	}

	const page = story.pages[+req.query.pageID] as ServerStoryPage | undefined;

	if (!page) {
		res.status(404).send({
			message: 'No page was found with the specified ID.'
		});
		return;
	}

	const comment = page.comments.find(({ id }) => stringifyID(id) === req.query.commentID);

	if (!comment) {
		res.status(404).send({
			message: 'No comment was found with the specified ID.'
		});
		return;
	}

	if (req.method === 'GET') {
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
				? comment.replies.findIndex(
					({ id }) => id.equals(afterID!)
				) + 1
				: 0
		);

		const commentReplies = comment.replies.slice(startIndex, startIndex + limit);

		res.send({
			comments: commentReplies.map(commentReply => (
				getClientCommentReply(commentReply, user)
			)),
			userCache: await users.find!({
				_id: {
					$in: uniqBy(commentReplies.map(({ author }) => author), String)
				},
				willDelete: { $exists: false }
			}).map(getPublicUser).toArray()
		});
		return;
	}

	// If this point is reached, `req.method === 'POST'`.

	if (!user) {
		res.status(403).send({
			message: 'You must be signed in to post comments.'
		});
		return;
	}

	const serverCommentReply: ServerCommentReply = {
		id: new ObjectId(),
		posted: new Date(),
		author: user._id,
		content: req.body.content,
		likes: [],
		dislikes: []
	};

	await stories.updateOne({
		_id: story._id,
		[`pages.${page.id}.comments.id`]: comment.id
	}, {
		$push: {
			[`pages.${page.id}.comments.$.replies`]: serverCommentReply
		}
	});

	res.status(201).send(getClientCommentReply(serverCommentReply, user));
};

export default Handler;