import validate from './index.validate';
import type { APIHandler } from 'lib/server/api';
import type { ServerComment } from 'lib/server/comments';
import { getClientComment } from 'lib/server/comments';
import type { StoryPageID } from 'lib/server/stories';
import { getStoryByUnsafeID } from 'lib/server/stories';
import { authenticate } from 'lib/server/auth';
import type { ClientComment } from 'lib/client/comments';
import { Perm } from 'lib/client/perms';
import type { integer } from 'lib/types';
import type { PublicUser } from 'lib/client/users';
import { StoryPrivacy } from 'lib/client/stories';
import users, { getPublicUser } from 'lib/server/users';
import { uniqBy } from 'lodash';
import { ObjectId } from 'mongodb';

const Handler: APIHandler<{
	method: 'GET',
	query: {
		storyID: string,
		/** The page ID which comments are being requested from. */
		fromPageID: StoryPageID | string,
		/** How many results to respond with. */
		limit?: integer | string,
		/** Filter the results to only include comments posted before the comment with this ID. */
		before?: string,
		sort?: 'pageID' | 'newest' | 'oldest' | 'rating'
	}
}, {
	method: 'GET',
	body: {
		comments: ClientComment[],
		userCache: PublicUser[]
	}
}> = async (req, res) => {
	await validate(req, res);

	const story = await getStoryByUnsafeID(req.query.storyID, res);

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

	if (!story.allowComments) {
		res.status(403).send({
			message: 'Comments are disabled on the specified adventure.'
		});
		return;
	}

	const fromPageID = +req.query.fromPageID;

	if (!(fromPageID in story.pages)) {
		res.status(422).send({
			message: 'No page was found with the specified ID.'
		});
		return;
	}

	const sort = req.query.sort || 'pageID';

	let limit = req.query.limit ? +req.query.limit : NaN;

	if (Number.isNaN(limit) || limit > 50) {
		limit = 50;
	}

	/** An `ObjectId` of `req.query.before`, or undefined if none was specified. */
	let beforeCommentID = undefined;

	if (req.query.before) {
		try {
			beforeCommentID = new ObjectId(req.query.before);
		} catch {
			res.status(422).send({
				message: 'The comment ID in the specified `before` query is invalid.'
			});
			return;
		}
	}

	let comments: ServerComment[] = [];

	if (sort === 'pageID') {
		// Append the exact number of requested results in sorted order to begin with.

		// If `beforeCommentID` is set, don't push anything until we reach the comment with that ID.
		/** Once set to true, all following iterations should push a comment to `comments`. */
		let shouldPush = beforeCommentID === undefined;

		pageLoop:
		for (let i = fromPageID; i >= 1; i--) {
			const page = story.pages[i];

			for (let j = 0; j < page.comments.length; j++) {
				const comment = page.comments[j];

				if (shouldPush) {
					comments.push(comment);

					// If we have enough comments, stop iterating.
					if (comments.length >= limit) {
						break pageLoop;
					}
				} else if (
					// Since `shouldPush` is false, we can assert `beforeCommentID!` here because `shouldPush` can only ever be declared false if `beforeCommentID` is not undefined.
					comment.id.equals(beforeCommentID!)
				) {
					// Once we reach the comment whose ID is `beforeCommentID`, we can start pushing any comments after it.
					shouldPush = true;
				}
			}
		}
	} else {
		// Push, sort, and slice the results.

		// Push all comments to the array with no limit.
		for (let i = 1; i <= fromPageID; i++) {
			const page = story.pages[i];

			comments.push(...page.comments);
		}

		const startIndex = (
			req.query.before
				? comments.findIndex(
					({ id }) => id.toString() === req.query.before
				) + 1
				: 0
		);

		// Sort and limit.
		comments = comments.sort((a, b) => (
			sort === 'newest'
				? +a.posted - +b.posted
				: sort === 'oldest'
					? +b.posted - +a.posted
					// If this point is reached, `sort === 'rating'`.
					: a.likes.length - b.likes.length
		)).slice(startIndex, startIndex + limit);
	}

	res.send({
		comments: comments.map(getClientComment),
		userCache: await users.find!({
			_id: {
				$in: uniqBy(comments.map(({ author }) => author), String)
			},
			willDelete: { $exists: false }
		}).map(getPublicUser).toArray()
	});
};

export default Handler;