import validate from './index.validate';
import type { APIHandler } from 'modules/server/api';
import type { StoryPage } from 'modules/server/stories';
import stories, { getStoryByUnsafeID, getClientStoryPage } from 'modules/server/stories';
import { authenticate } from 'modules/server/auth';
import type { ClientStoryPage, ClientStoryPageRecord } from 'modules/client/stories';
import type { RecursivePartial } from 'modules/types';
import { Perm } from 'modules/client/perms';
import { flatten } from 'modules/server/db';
import { mergeWith } from 'lodash';
import { overwriteArrays } from 'modules/client/utilities';

/** The keys of all `ClientStoryPage` properties which the client should be able to `PUT` into any of their existing `StoryDocument['pages']`. */
type PuttableStoryPageKey = 'published' | 'title' | 'content' | 'nextPages' | 'tags' | 'unlisted' | 'disableControls' | 'commentary' | 'notify';

const Handler: APIHandler<{
	query: {
		storyID: string
	},
	method: 'PUT',
	/** A record of `ClientStoryPage`s (some of which are partial) to add or change. */
	body: Record<(
		// The ID of the page to add or change.
		// The reason this is `string` is because the schema generator ignores `number` keys and doesn't seem to have any support for `patternProperties`. The checks to ensure the validity of these keys are instead done in the handler.
		string
	), (
		// A new page being added (includes `id`).
		ClientStoryPage
		// Changes to an existing page (excludes `id`).
		| RecursivePartial<Pick<ClientStoryPage, PuttableStoryPageKey>>
	)>
}, {
	method: 'PUT',
	/** A record of the `ClientStoryPage`s which were modified or added. */
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

	const newClientPages: ClientStoryPageRecord = {};
	const storyUpdate: Record<string, unknown> = {};

	for (const pageIDString of Object.keys(req.body)) {
		const pageID = +pageIDString;

		if (!(
			Number.isInteger(pageID)
			&& pageID > 0
		)) {
			res.status(400).send({
				message: 'A page ID must be an integer greater than 0.'
			});
			return;
		}

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

			if (!(
				pageID === 1
				|| pageID - 1 in story.pages
				|| pageID - 1 in req.body
			)) {
				res.status(422).send({
					message: `Page ${pageID} cannot be added if there is no page ${pageID - 1}.`
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

			newClientPages[pageID] = getClientStoryPage(page);
		} else {
			// `clientPage` is the changes for an existing page being edited.

			const { published, ...clientPageWithoutPublished } = clientPage;
			const pageChanges: RecursivePartial<StoryPage> = {
				...clientPageWithoutPublished,
				...published !== undefined && {
					published: new Date(published)
				}
			};

			flatten(pageChanges, `pages.${pageID}.`, storyUpdate);

			// Convert the modified `StoryPage` to a `ClientStoryPage` to send back to the client.
			newClientPages[pageID] = getClientStoryPage(
				// Merge the changes in `pageChanges` into the original `StoryPage` to get what it would be after the changes.
				mergeWith(
					{},
					// The original `StoryPage`.
					story.pages[pageID],
					// The requested `StoryPage` changes.
					pageChanges,
					overwriteArrays
				)
			);
		}
	}

	stories.updateOne({ _id: story._id }, {
		$set: storyUpdate
	});

	res.status(200).send(newClientPages);
};

export default Handler;