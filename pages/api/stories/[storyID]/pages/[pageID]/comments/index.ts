import validate from './index.validate';
import type { APIHandler } from 'lib/server/api';
import type { ServerComment } from 'lib/server/comments';
import { getClientComment } from 'lib/server/comments';
import type { ServerStoryPage } from 'lib/server/stories';
import stories from 'lib/server/stories';
import getStoryByUnsafeID from 'lib/server/stories/getStoryByUnsafeID';
import authenticate from 'lib/server/auth/authenticate';
import type { ClientComment } from 'lib/client/comments';
import { Perm } from 'lib/client/perms';
import { ObjectId } from 'mongodb';
import StoryPrivacy from 'lib/client/StoryPrivacy';

const Handler: APIHandler<{
	query: {
		storyID: string,
		pageID: string
	},
	method: 'POST',
	body: Pick<ClientComment, 'content'>
}, {
	method: 'POST',
	body: ClientComment
}> = async (req, res) => {
	await validate(req, res);

	const { user } = await authenticate(req, res);

	if (!user) {
		res.status(403).send({
			message: 'You must be signed in to post comments.'
		});
		return;
	}

	const story = await getStoryByUnsafeID(req.query.storyID, res);

	if (story.privacy === StoryPrivacy.Private && !(
		story.owner.equals(user._id)
		|| story.editors.some(userID => userID.equals(user._id))
		|| user.perms & Perm.sudoWrite
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

	const serverComment: ServerComment = {
		id: new ObjectId(),
		posted: new Date(),
		author: user._id,
		content: req.body.content,
		likes: [],
		dislikes: [],
		replies: []
	};

	await stories.updateOne({
		_id: story._id
	}, {
		$push: {
			[`pages.${page.id}.comments`]: {
				$each: [serverComment],
				// Push to the start of the array, since the `comments` array should always be sorted from newest to oldest.
				$position: 0
			}
		}
	});

	res.status(201).send(getClientComment(serverComment, page.id, user));
};

export default Handler;