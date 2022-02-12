import validate from './index.validate';
import type { APIHandler } from 'lib/server/api';
import type { ServerComment } from 'lib/server/comments';
import { getClientComment } from 'lib/server/comments';
import type { ServerStoryPage, StoryPageID } from 'lib/server/stories';
import getStoryByUnsafeID from 'lib/server/stories/getStoryByUnsafeID';
import authenticate from 'lib/server/auth/authenticate';
import type { ClientComment } from 'lib/client/comments';
import { Perm } from 'lib/client/perms';
import type { integer } from 'lib/types';
import type { PublicUser } from 'lib/client/users';
import StoryPrivacy from 'lib/client/StoryPrivacy';
import users, { getPublicUser } from 'lib/server/users';
import { uniqBy } from 'lodash';
import { ObjectId } from 'mongodb';
import stringifyID from 'lib/server/db/stringifyID';

export type StoryCommentsSortMode = 'pageID' | 'newest' | 'oldest' | 'rating';

const Handler: APIHandler<{
	method: 'GET',
	query: {
		storyID: string,
		/** The page ID which comments are being requested from. */
		fromPageID: StoryPageID | string,
		/** How many results to respond with. */
		limit?: integer | string,
		/** Filter the results to only include comments after the comment with this ID. */
		after?: string,
		sort?: StoryCommentsSortMode
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

	/** An `ObjectId` of `req.query.after`, or undefined if none was specified. */
	let afterID = undefined;

	if (req.query.after) {
		try {
			afterID = new ObjectId(req.query.after);
		} catch {
			res.status(400).send({
				message: 'The comment ID in the specified `after` query is invalid.'
			});
			return;
		}
	}

	let comments: ServerComment[] = [];
	/** A record mapping the ID of each comment to the ID of the page it's on. */
	const commentPageIDs: Record<string, StoryPageID> = {};

	/**
	 * Adds a comment to `comments` and `commentPageIDs`.
	 *
	 * If the page the comment is on is unlisted and not the page the client is on, then does nothing.
	 */
	const addCommentIfListed = (
		comment: ServerComment,
		/** The page that the comment is on. */
		page: ServerStoryPage
	) => {
		if (page.unlisted && page.id !== fromPageID) {
			return;
		}

		comments.push(comment);
		commentPageIDs[stringifyID(comment.id)] = page.id;
	};

	if (sort === 'pageID') {
		// Append the exact number of requested results in sorted order to begin with.

		/** Once set to true, all following iterations should push a comment to `comments`. */
		// If `afterID` is set, don't push anything until we reach the comment with that ID.
		let shouldPush = afterID === undefined;

		pageLoop:
		for (let i = fromPageID; i >= 1; i--) {
			const page = story.pages[i];

			for (const comment of page.comments) {
				if (shouldPush) {
					addCommentIfListed(comment, page);

					// If we have enough comments, stop iterating.
					if (comments.length >= limit) {
						break pageLoop;
					}
				} else if (
					// Since `shouldPush` is false, we can assert `afterID!` here because `shouldPush` can only ever be declared false if `afterID` is not undefined.
					comment.id.equals(afterID!)
				) {
					// Once we reach the comment whose ID is `afterID`, we can start pushing any comments after it.
					shouldPush = true;
				}
			}
		}
	} else {
		// Push, sort, and slice the results.

		// Push all comments to the array with no limit.
		for (let i = 1; i <= fromPageID; i++) {
			const page = story.pages[i];

			for (const comment of page.comments) {
				addCommentIfListed(comment, page);
			}
		}

		// Sort and limit.
		comments = comments.sort((a, b) => (
			sort === 'newest'
				? +b.posted - +a.posted
				: sort === 'oldest'
					? +a.posted - +b.posted
					// If this point is reached, `sort === 'rating'`.
					: (
						// Sort by net rating (like count minus dislike count).
						(b.likes.length - b.dislikes.length) - (a.likes.length - a.dislikes.length)
						// Sort by like count if they have the same net rating.
						|| b.likes.length - a.likes.length
						// Sort by page ID if they have the same net rating and like count.
						|| commentPageIDs[stringifyID(b.id)] - commentPageIDs[stringifyID(a.id)]
						// Sort by newest if they have the same net rating, like count, and page ID.
						|| +b.posted - +a.posted
					)
		));

		const startIndex = (
			req.query.after
				? comments.findIndex(
					({ id }) => stringifyID(id) === req.query.after
				) + 1
				: 0
		);

		comments = comments.slice(startIndex, startIndex + limit);
	}

	res.send({
		comments: comments.map(comment => (
			getClientComment(
				comment,
				commentPageIDs[stringifyID(comment.id)],
				user
			)
		)),
		userCache: await users.find!({
			_id: {
				$in: uniqBy(comments.map(({ author }) => author), String)
			},
			willDelete: { $exists: false }
		}).map(getPublicUser).toArray()
	});
};

export default Handler;