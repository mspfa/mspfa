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
import StoryPrivacy from 'lib/client/StoryPrivacy';
import flatten from 'lib/server/db/flatten';
import stringifyID from 'lib/server/db/stringifyID';

/** The keys of all `ClientCommentReply` properties which a client should be able to `PATCH` into a `ServerComment`. */
type WritableCommentReplyKey = 'content';

const Handler: APIHandler<{
	query: {
		storyID: string,
		pageID: string,
		commentID: string,
		commentReplyID: string
	}
} & (
	{
		method: 'GET'
	} | {
		method: 'DELETE'
	} | {
		method: 'PATCH',
		body: Pick<ClientCommentReply, WritableCommentReplyKey>
	}
), {
	method: 'GET',
	body: ClientCommentReply
} | {
	method: 'DELETE'
} | {
	method: 'PATCH',
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

	const commentReply = comment.replies.find(({ id }) => stringifyID(id) === req.query.commentReplyID);

	if (!commentReply) {
		res.status(404).send({
			message: 'No comment reply was found with the specified ID.'
		});
		return;
	}

	if (req.method === 'GET') {
		res.send(getClientCommentReply(commentReply, user));
		return;
	}

	if (req.method === 'DELETE') {
		if (!(
			user && (
				commentReply.author.equals(user._id)
				|| story.owner.equals(user._id)
				|| story.editors.some(userID => userID.equals(user._id))
				|| user.perms & Perm.sudoDelete
			)
		)) {
			res.status(403).send({
				message: 'You do not have permission to delete the specified comment reply.'
			});
			return;
		}

		await stories.updateOne({
			_id: story._id,
			[`pages.${page.id}.comments.id`]: comment.id
		}, {
			$pull: {
				[`pages.${page.id}.comments.$.replies`]: {
					id: commentReply.id
				}
			}
		});

		res.status(204).end();
		return;
	}

	// If this point is reached, `req.method === 'PATCH'`.

	if (!(
		user && (
			commentReply.author.equals(user._id)
			|| user.perms & Perm.sudoWrite
		)
	)) {
		res.status(403).send({
			message: 'You do not have permission to edit the specified comment reply.'
		});
		return;
	}

	const commentReplyChanges: Partial<ServerCommentReply> = {
		...req.body,
		edited: new Date()
	};

	Object.assign(commentReply, commentReplyChanges);

	await stories.updateOne({
		_id: story._id
	}, {
		$set: flatten(commentReplyChanges, `pages.${page.id}.comments.$[comment].replies.$[commentReply].`)
	}, {
		arrayFilters: [
			{ 'comment.id': comment.id },
			{ 'commentReply.id': commentReply.id }
		]
	});

	res.send(getClientCommentReply(commentReply, user));
};

export default Handler;