import validate from './index.validate';
import type { APIHandler } from 'lib/server/api';
import type { ServerStory, ServerStoryPage, StoryPageID } from 'lib/server/stories';
import { getStoryByUnsafeID, getClientStoryPage, updateStorySchedule, getClientPagesAround } from 'lib/server/stories';
import { authenticate } from 'lib/server/auth';
import type { ClientStoryPage, ClientStoryPageRecord } from 'lib/client/stories';
import { StoryPrivacy } from 'lib/client/stories';
import invalidPublishedOrder from 'lib/client/invalidPublishedOrder';
import type { DateNumber, RecursivePartial } from 'lib/types';
import { Perm } from 'lib/client/perms';
import { flatten } from 'lib/server/db';
import { mergeWith } from 'lodash';
import overwriteArrays from 'lib/client/overwriteArrays';
import type { UpdateFilter } from 'mongodb';

/** The keys of all `ClientStoryPage` properties which the client should be able to `PUT` into any of their existing `ServerStory['pages']` (except `'published'`). */
type PuttableStoryPageKey = 'title' | 'content' | 'nextPages' | 'unlisted' | 'disableControls' | 'commentary' | 'notify';

const Handler: APIHandler<{
	// This `unknown` is necessary to set because of what I believe is a `vega/ts-json-schema-generator` bug I have yet to report.
	// TODO: Look into this bug and submit an issue on the GitHub. A fix is critical here, because currently other `query` values are not being validated due to this bug.
	query: unknown & {
		storyID: string
	}
} & (
	{
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
	} | {
		method: 'DELETE',
		body: {
			/**
			 * The IDs of pages to delete.
			 *
			 * @uniqueItems true
			 */
			pageIDs: StoryPageID[]
		}
	} | {
		method: 'GET',
		query: {
			/** Defined if the user wants to include unpublished pages. Undefined if not. */
			preview?: string,
			/** The page ID to get the adjacent pages of, within the `PAGE_PRELOAD_DEPTH`. */
			aroundPageID: string,
			/** A string of comma-separated page IDs not to send in the response to the client, for example because the client already has them. */
			excludedPageIDs?: string
		}
	}
), (
	{
		method: 'PUT',
		/** A `ClientStoryPageRecord` of the pages which were modified or added. */
		body: ClientStoryPageRecord
	} | {
		method: 'GET',
		body: {
			/** A record which maps page IDs to `ClientStoryPage`s, or `null` if the page does not exist or the user doesn't have access to it. */
			pages: Record<StoryPageID, ClientStoryPage | null>,
			previousPageIDs: Record<StoryPageID, StoryPageID | null>
		}
	}
)> = async (req, res) => {
	await validate(req, res);

	const story = await getStoryByUnsafeID(req.query.storyID, res);

	if (req.method === 'GET') {
		const previewMode = 'preview' in req.query;

		// Check if the user is trying to do something that requires read perms.
		if (
			story.privacy === StoryPrivacy.Private
			|| previewMode
		) {
			const { user } = await authenticate(req, res);

			if (!(
				user && (
					story.owner.equals(user._id)
					|| story.editors.some(userID => userID.equals(user._id))
					|| user.perms & Perm.sudoRead
				)
			)) {
				res.status(403).send({
					message: `You do not have permission to ${previewMode ? 'use preview mode in the specified adventure' : 'read the specified adventure'}.`
				});
				return;
			}
		}

		const { clientPages, clientPreviousPageIDs } = getClientPagesAround(story, +req.query.aroundPageID, previewMode);

		if (req.query.excludedPageIDs) {
			for (const excludedPageIDString of req.query.excludedPageIDs.split(',')) {
				const excludedPageID = +excludedPageIDString;

				if (!Number.isNaN(excludedPageID)) {
					delete clientPages[excludedPageID];
					delete clientPreviousPageIDs[excludedPageID];
				}
			}
		}

		res.send({
			pages: clientPages,
			// Previous page IDs must be sent to the client because the client has no other way of knowing when a previous page ID is `null`.
			previousPageIDs: clientPreviousPageIDs as Record<StoryPageID, StoryPageID | null>
		});
		return;
	}

	const { user } = await authenticate(req, res);

	if (!(
		user && (
			story.owner.equals(user._id)
			|| story.editors.some(userID => userID.equals(user._id))
			|| user.perms & Perm.sudoWrite
		)
	)) {
		res.status(403).send({
			message: 'You do not have permission to edit the specified adventure.'
		});
		return;
	}

	const $set: Record<string, unknown> = {};
	const $unset: Record<string, true> = {};

	if (req.method === 'PUT') {
		const newClientPages: ClientStoryPageRecord = {};

		// Store `Date.now()` into a variable so it is not a different value each time, helping avoid inconsistencies.
		const now = Date.now();

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

				// This `as any` is necessary because of what I believe is a TypeScript bug which I have yet to report or find a report of.
				// TODO: Report this bug, remove `as any` if it's fixed, or fix my code if it's not actually a bug.
				if (pageID as any !== clientPage.id) {
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
				const newPage: ServerStoryPage = {
					...clientPageWithoutPublished,
					...published !== undefined && published !== null && {
						published: new Date(published),
						...published > now && {
							scheduled: true
						}
					},
					comments: []
				};

				$set[`pages.${pageID}`] = newPage;

				story.pages[pageID] = newPage;
				newClientPages[pageID] = getClientStoryPage(newPage);
			} else {
				// `clientPage` is the changes for an existing page being edited.

				if (!(pageID in story.pages)) {
					res.status(422).send({
						message: `Page ${pageID} does not exist.`
					});
					return;
				}

				const { published, ...clientPageWithoutPublished } = clientPage;
				const pageChanges: RecursivePartial<ServerStoryPage> = {
					...clientPageWithoutPublished,
					...published !== undefined && published !== null && {
						published: new Date(published),
						...published > now && {
							scheduled: true
						}
					}
				};

				const page = story.pages[pageID];

				if (
					// The client wants to set this page as a draft.
					published === null
					// The page is not already a draft.
					&& page.published !== undefined
				) {
					// Set this page as a draft.

					$unset[`pages.${pageID}.published`] = true;
					delete page.published;

					if (page.scheduled) {
						$unset[`pages.${pageID}.scheduled`] = true;
						delete page.scheduled;
					}
				}

				flatten(pageChanges, `pages.${pageID}.`, $set);

				// Convert the modified `ServerStoryPage` to a `ClientStoryPage` to send back to the client.
				newClientPages[pageID] = getClientStoryPage(
					// Merge the changes in `pageChanges` into the original `ServerStoryPage` to get what it would be after the changes.
					mergeWith(page, pageChanges, overwriteArrays)
				);
			}
		}

		const pageValues = Object.values(story.pages);
		// Iterate over all `pageValues` except the first one.
		for (let i = 1; i < pageValues.length; i++) {
			// Ensure that it is still impossible with the new changes for the `published` dates to result in gaps in published pages.
			if (invalidPublishedOrder(
				pageValues[i - 1].published,
				pageValues[i].published,
				now
			)) {
				res.status(422).send({
					message: `Page ${i + 1} should not have a \`published\` date set before page ${i}.`
				});
				return;
			}
		}

		await updateStorySchedule(story, { $set, $unset });

		res.send(newClientPages);
		return;
	}

	// If this point is reached, `req.method === 'DELETE'`.

	for (const pageIDToDelete of req.body.pageIDs) {
		if (!(pageIDToDelete in story.pages)) {
			res.status(422).send({
				message: `Page ${pageIDToDelete} does not exist.`
			});
			return;
		}
	}

	const updateQuery: UpdateFilter<ServerStory> = { $unset };

	const pageValues = Object.values(story.pages);

	/** The number of pages which have been deleted before the page in the current `for` loop iteration. */
	let deletedBeforeThisPage = 0;
	for (const page of pageValues) {
		// Check if this page should be deleted.
		if (req.body.pageIDs.includes(page.id)) {
			/** The ID of the page which would technically be deleted from the database as a result of being shifted down due to this iteration's page being deleted. */
			const lastPageID = pageValues.length - deletedBeforeThisPage;

			// Delete the page from the database.
			$unset[`pages.${lastPageID}`] = true;

			// Delete the page from `story` so `story.pages` is in sync with what the database will be after the `updateQuery`, allowing `story` to safely be passed into `updateStorySchedule`.
			delete story.pages[lastPageID];

			deletedBeforeThisPage++;
		} else {
			// This page should not be deleted and may need page ID adjustments.

			/** Whether this page's `nextPages` has changed. */
			let nextPagesChanged = false;

			// Adjust IDs of pages in `page.nextPages` after the deleted pages.
			for (let i = 0; i < page.nextPages.length; i++) {
				/** The ID of this `nextPages` page. */
				const nextPagesID = page.nextPages[i];

				// Decrement this `nextPagesID` by 1 for each deleted page before it.
				for (const pageIDToDelete of req.body.pageIDs) {
					if (pageIDToDelete < nextPagesID) {
						page.nextPages[i]--;
						nextPagesChanged = true;
					}
				}
			}

			// Adjust IDs of pages after the deleted pages.
			if (deletedBeforeThisPage) {
				page.id -= deletedBeforeThisPage;

				// Set this page (with its `id` and `nextPages` adjusted) into the adjusted page ID in the database.
				$set[`pages.${page.id}`] = page;

				// Do the same in `story.pages` so it is in sync with what the database will be after the `updateQuery`, allowing `story` to safely be passed into `updateStorySchedule`.
				story.pages[page.id] = page;
			} else if (nextPagesChanged) {
				// If this page isn't already being added to `$set` due to an ID adjustment but still has a changed `nextPages`, add this page's changed `nextPages` to `$set`.
				$set[`pages.${page.id}.nextPages`] = page.nextPages;
			}
		}
	}

	if (Object.values($set).length) {
		updateQuery.$set = $set;
	}

	await updateStorySchedule(story, updateQuery);

	// TODO: Adjust page IDs in users' gave saves.

	res.end();
};

export default Handler;