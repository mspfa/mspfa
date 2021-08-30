import validate from './index.validate';
import type { APIHandler } from 'lib/server/api';
import { getClientComment } from 'lib/server/comments';
import type { ServerStoryPage } from 'lib/server/stories';
import stories, { getStoryByUnsafeID } from 'lib/server/stories';
import { authenticate } from 'lib/server/auth';
import type { ClientComment } from 'lib/client/comments';
import { Perm } from 'lib/client/perms';
import { StoryPrivacy } from 'lib/client/stories';
import { ObjectId } from 'mongodb';

const Handler: APIHandler<{
	query: {
		storyID: string,
		pageID: string,
		commentID: string,
		userID: string
	},
	method: 'PUT',
	body: {
		rating: NonNullable<ClientComment['userRating']>
	}
}, {
	method: 'PUT',
	body: ClientComment
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

	const comment = page.comments.find(({ id }) => id.toString() === req.query.commentID);

	if (!comment) {
		res.status(404).send({
			message: 'No comment was found with the specified ID.'
		});
		return;
	}

	/** An `ObjectId` of `req.query.userID`. */
	let userID: ObjectId;

	try {
		userID = new ObjectId(req.query.userID);
	} catch {
		res.status(400).send({
			message: 'The specified user ID is invalid.'
		});
		return;
	}

	if (!(
		user && (
			userID.equals(user._id)
			|| user.perms & Perm.sudoWrite
		)
	)) {
		res.status(403).send({
			message: 'You do not have permission to edit the specified user\'s rating.'
		});
		return;
	}

	if (comment.author.equals(userID)) {
		res.status(403).send({
			message: 'A user cannot rate their own comment.'
		});
		return;
	}

	const clientComment = getClientComment(comment, page.id, user);

	/** Maps `1` to `'likes'` and `-1` to `'dislikes'`. */
	const ratingNumberToString = (rating: -1 | 1) => (
		rating === 1 ? 'likes' : 'dislikes'
	);

	// Only update the comment if the specified rating is not already set on the comment.
	if (req.body.rating !== clientComment.userRating) {
		await stories.updateOne({
			_id: story._id,
			[`pages.${page.id}.comments.id`]: comment.id
		}, {
			// Remove the user's initial rating if they have one.
			...clientComment.userRating && {
				$pull: {
					[`pages.${page.id}.comments.$.${ratingNumberToString(clientComment.userRating)}`]: userID
				}
			},
			// Add the user's requested rating if they have one.
			...req.body.rating && {
				$push: {
					[`pages.${page.id}.comments.$.${ratingNumberToString(req.body.rating)}`]: userID
				}
			}
		});
	}

	res.send(clientComment);
};

export default Handler;