import validate from './index.validate';
import type { APIHandler } from 'modules/server/api';
import type { StoryPage, StoryPageID } from 'modules/server/stories';
import stories, { getStoryByUnsafeID } from 'modules/server/stories';
import { authenticate } from 'modules/server/auth';
import type { ClientStoryPage, ClientStoryPageRecord } from 'modules/client/stories';
import type { RecursivePartial } from 'modules/types';
import { Perm } from 'modules/client/perms';
import { flatten } from 'modules/server/db';

/** The keys of all `ClientStoryPage` properties which the client should be able to `PUT` into any of their existing `StoryDocument['pages']`. */
type PuttableStoryPageKey = 'published' | 'title' | 'content' | 'nextPages' | 'tags' | 'unlisted' | 'disableControls' | 'commentary' | 'notify';

const Handler: APIHandler<{
	query: {
		storyID: string
	}
} & (
	{
		method: 'PUT',
		/** A record of `ClientStoryPage`s (some of which are partial) to add or change. */
		body: Record<(
			// The ID of the page to add or change.
			StoryPageID
		), (
			// A new page being added (includes `id`).
			ClientStoryPage
			// Changes to an existing page (excludes `id`).
			| RecursivePartial<Pick<ClientStoryPage, PuttableStoryPageKey>>
		)>
	}
), {
	method: 'POST',
	body: ClientStoryPageRecord
}> = async (req, res) => {
	await validate(req, res);

	const { user } = await authenticate(req, res);

	if (!user) {
		res.status(403).send({
			message: 'You must be signed in to edit an adventure.'
		});
		return;
	}

	const story = await getStoryByUnsafeID(req.query.storyID, res);

	if (!(
		story.owner.equals(user._id)
		|| story.editors.some(userID => userID.equals(user._id))
		|| user.perms & Perm.sudoWrite
	)) {
		res.status(403).send({
			message: 'You do not have permission to edit the specified adventure.'
		});
		return;
	}

	const storyUpdate: Record<string, unknown> = {};

	for (const pageIDString of Object.keys(req.body)) {
		const pageID = +pageIDString;

		const clientPage = req.body[pageID];

		if ('id' in clientPage) {
			// `clientPage` is a new page being posted.

			if (pageID in story.pages) {
				res.status(422).send({
					message: `Page ${pageID} already exists and cannot have its \`id\` overwritten.`
				});
				return;
			}

			if (pageID !== clientPage.id) {
				res.status(400).send({
					message: `Page ${pageID}'s \`id\` is not set to ${pageID}.`
				});
				return;
			}

			const { published, ...clientPageWithoutPublished } = clientPage;

			const page: StoryPage = {
				...clientPageWithoutPublished,
				...published !== undefined && {
					published: new Date(published)
				},
				comments: []
			};

			storyUpdate[`pages.${pageID}`] = page;
		} else {
			// `clientPage` is an existing page being edited.

			flatten(clientPage, `pages.${pageID}.`, storyUpdate);
		}
	}

	stories.updateOne({ _id: story._id }, storyUpdate);

	res.status(201).end();
};

export default Handler;