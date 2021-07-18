import validate from './index.validate';
import type { APIHandler } from 'modules/server/api';
import type { StoryPage } from 'modules/server/stories';
import stories, { getStoryByUnsafeID, getClientStoryPage } from 'modules/server/stories';
import { authenticate } from 'modules/server/auth';
import type { ClientStoryPage, ClientStoryPageRecord } from 'modules/client/stories';
import type { DateNumber, RecursivePartial } from 'modules/types';
import { Perm } from 'modules/client/perms';
import { flatten } from 'modules/server/db';
import { mergeWith } from 'lodash';
import { overwriteArrays } from 'modules/client/utilities';

/** The keys of all `ClientStoryPage` properties which the client should be able to `PUT` into any of their existing `StoryDocument['pages']` (except `'published'`). */
type PuttableStoryPageKey = 'title' | 'content' | 'nextPages' | 'tags' | 'unlisted' | 'disableControls' | 'commentary' | 'notify';

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
		(
			// A new page being added (includes `id`).
			Omit<ClientStoryPage, 'published'>
			// Changes to an existing page (excludes `id`).
			| RecursivePartial<Pick<ClientStoryPage, PuttableStoryPageKey>>
		) & {
			published?: DateNumber | null
		}
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
	const $set: Record<string, unknown> = {};
	const $unset: Record<string, true> = {};

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
				...published !== undefined && published !== null && {
					published: new Date(published)
				},
				comments: []
			};

			$set[`pages.${pageID}`] = page;

			story.pages[pageID] = page;
			newClientPages[pageID] = getClientStoryPage(page);
		} else {
			// `clientPage` is the changes for an existing page being edited.

			if (!(pageID in story.pages)) {
				res.status(422).send({
					message: `Page ${pageID} does not exist.`
				});
				return;
			}

			const { published, ...clientPageWithoutPublished } = clientPage;
			const pageChanges: RecursivePartial<StoryPage> = {
				...clientPageWithoutPublished,
				...published !== undefined && published !== null && {
					published: new Date(published)
				}
			};

			if (
				// The client wants to set this page as a draft.
				published === null
				// The page is not already a draft.
				&& story.pages[pageID].published !== undefined
			) {
				// Set this page as a draft.
				$unset[`pages.${pageID}.published`] = true;
				delete story.pages[pageID].published;
			}

			flatten(pageChanges, `pages.${pageID}.`, $set);

			// Convert the modified `StoryPage` to a `ClientStoryPage` to send back to the client.
			newClientPages[pageID] = getClientStoryPage(
				// Merge the changes in `pageChanges` into the original `StoryPage` to get what it would be after the changes.
				mergeWith(
					// The original `StoryPage`.
					story.pages[pageID],
					// The requested `StoryPage` changes.
					pageChanges,
					overwriteArrays
				)
			);
		}
	}

	const now = Date.now();

	let updatedPageCount = 0;

	const pageValues = Object.values(story.pages);
	for (let i = 0; i < pageValues.length; i++) {
		const page = pageValues[i];
		const published = +(page.published ?? Infinity);

		// The logic in this block requires information about the previous page, so we must exclude the first page, since that doesn't have a previous page.
		if (i !== 0) {
			const previousPublished = +(pageValues[i - 1].published ?? Infinity);

			// Ensure that it is still impossible with the new changes for the `published` dates to result in gaps in published pages.
			if (
				// Check if the previous page is unpublished. On the other hand, if the previous page is published, we don't care when this page is being published.
				previousPublished > now
				// Check if this page would be published before the previous page (which shouldn't be allowed since it would allow for gaps in published pages).
				&& published < previousPublished
			) {
				res.status(422).send({
					message: `Page ${page.id} should not have a \`published\` date set before page ${page.id - 1}.`
				});
				return;
			}
		}

		if (published <= now && !page.unlisted) {
			// If this page is public, set the page count to its ID.
			updatedPageCount = page.id;
			// The reason we don't run `updatedPageCount++` here instead is because it's better to use the ID of the last public page as the page count rather than the actual quantity of public pages. If we did use the actual quantity of public pages as the page count, then for example, if a story's last public page ID is 40 but there is a single earlier page which is unlisted, then the page count would say 39. For those who notice this inconsistency, it could be confusing, appear to be a bug, or even hint at an unlisted page which they might then actively look for. Simply using the ID of the last public page rather than the true public page count avoids all of this with no tangible issues.
		}
	}

	if (updatedPageCount !== story.pageCount) {
		// If the page count changed, update it.
		$set.pageCount = updatedPageCount;
		// TODO: Update page count upon release of scheduled pages.
	}

	const setValues = Object.values($set).length;
	const unsetValues = Object.values($unset).length;

	if (setValues || unsetValues) {
		await stories.updateOne({
			_id: story._id
		}, {
			...setValues && { $set },
			...unsetValues && { $unset }
		});
	}

	res.status(200).send(newClientPages);
};

export default Handler;