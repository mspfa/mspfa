import validate from './index.validate';
import type { APIHandler } from 'lib/server/api';
import type { ServerStory, ServerStoryPage, StoryID, StoryPageID } from 'lib/server/stories';
import { getClientStoryPage } from 'lib/server/stories';
import updateStorySchedule from 'lib/server/stories/updateStorySchedule';
import getStoryByUnsafeID from 'lib/server/stories/getStoryByUnsafeID';
import getClientPagesAround from 'lib/server/stories/getClientPagesAround';
import authenticate from 'lib/server/auth/authenticate';
import type { ClientStoryPage, ClientStoryPageRecord } from 'lib/client/stories';
import StoryPrivacy from 'lib/client/StoryPrivacy';
import invalidPublishedOrder from 'lib/client/invalidPublishedOrder';
import type { DateNumber, integer, Mutable, RecursivePartial } from 'lib/types';
import { Perm } from 'lib/client/perms';
import flatten from 'lib/server/db/flatten';
import { mergeWith } from 'lodash';
import overwriteArrays from 'lib/client/overwriteArrays';
import type { UpdateFilter } from 'mongodb';
import users from 'lib/server/users';

/** The keys of all `ClientStoryPage` properties which the client should be able to `PATCH` into any of their existing `ServerStory['pages']` (except `'published'`). */
type WritableStoryPageKey = 'title' | 'content' | 'nextPages' | 'unlisted' | 'disableControls' | 'commentary' | 'silent';

const Handler: APIHandler<{
	// This `unknown` is necessary to set because of https://github.com/vega/ts-json-schema-generator/issues/1029.
	// TODO: Ensure this is fixed before use in production. A fix is critical here, because currently other `query` values are not being validated due to this bug.
	query: unknown & {
		storyID: string
	}
} & (
	{
		method: 'PATCH',
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
				| RecursivePartial<Pick<ClientStoryPage, WritableStoryPageKey>>
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
		method: 'PATCH',
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

	const $set: Mutable<UpdateFilter<ServerStory>['$set']> = {};
	const $unset: Mutable<UpdateFilter<ServerStory>['$unset']> = {};

	if (req.method === 'PATCH') {
		const newClientPages: ClientStoryPageRecord = {};

		// Store the current date into a variable so it is not a different value each time, helping avoid inconsistencies.
		const dateNow = new Date();
		const now = +dateNow;

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
			const { published, ...clientPageWithoutPublished } = clientPage;
			const publishedAndScheduled = (
				published !== undefined && published !== null && {
					published: new Date(published),
					...published > now && {
						scheduled: true as const
					}
				}
			);

			if ('id' in clientPageWithoutPublished) {
				// `clientPage` is a new page being posted.

				if (pageID in story.pages) {
					res.status(422).send({
						message: `Page ${pageID} already exists and cannot have its \`id\` overwritten.`
					});
					return;
				}

				// This `as any` is necessary because of what I believe is a TypeScript bug which I have yet to report or find a report of.
				// TODO: Report this bug, remove `as any` if it's fixed, or fix my code if it's not actually a bug.
				if (pageID as any !== clientPageWithoutPublished.id) {
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

				const newPage: ServerStoryPage = {
					...clientPageWithoutPublished,
					...publishedAndScheduled,
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

				const pageChanges: RecursivePartial<ServerStoryPage> = {
					...clientPageWithoutPublished,
					...publishedAndScheduled
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

	/** The ID of the first deleted page. */
	let firstDeletedPageID: StoryPageID | undefined;
	/** The ID of the first page which is not to be deleted. */
	let firstNonDeletedPageID: StoryPageID | undefined;
	/** The ID of the previous deleted page. */
	let previousDeletedPageID: StoryPageID | undefined;

	/** The MongoDB `$switch` operation's `branches` used to determine how much to subtract from each user's `storySaves` entry for this story. */
	const branches: Array<{
		case: {
			$and: [
				{ $gte: [`$storySaves.${StoryID}`, StoryPageID] },
				{ $lt: [`$storySaves.${StoryID}`, StoryPageID] }
			]
		},
		/** The amount to subtract from the user's `storySaves` entry for this story. */
		then: integer
	}> = [];

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

			if (deletedBeforeThisPage === 0) {
				firstDeletedPageID = page.id;
			}

			// Prepare to adjust page IDs in users' story saves.
			if (
				// To shift the saved page IDs between the previous deleted page and this deleted page, there must be a previous deleted page.
				previousDeletedPageID
				// Ensure all pages before this one are not also deleted, in which case all story saves on or before this page should be deleted rather than shifted, since there would be no earlier non-deleted pages to shift onto.
				&& firstNonDeletedPageID
			) {
				branches.push({
					// If a user's save for this story is after or on the previous deleted page and before this deleted page,
					case: {
						$and: [
							{ $gte: [`$storySaves.${story._id}`, previousDeletedPageID] },
							{ $lt: [`$storySaves.${story._id}`, page.id] }
						]
					},
					// then subtract `deletedBeforeThisPage` from the saved page ID.
					then: deletedBeforeThisPage
				});
			}

			deletedBeforeThisPage++;
			previousDeletedPageID = page.id;
		} else {
			// This page should not be deleted and may need page ID adjustments.

			if (firstNonDeletedPageID === undefined) {
				firstNonDeletedPageID = page.id;
			}

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

	const storySaveUpdates: Array<Promise<any>> = [];

	// Adjust page IDs in users' story saves, which is only necessary if there are any deleted pages.
	if (firstDeletedPageID) {
		if (
			// Only shift saved page IDs if there are any non-deleted pages to shift onto.
			firstNonDeletedPageID
			// Only shift saved page IDs if there are any pages that need to be shifted after a non-deleted page that can be shifted onto.
			&& previousDeletedPageID! > firstNonDeletedPageID
		) {
			storySaveUpdates.push(
				users.updateMany({
					[`storySaves.${story._id}`]: {
						// The ID of the earliest page that should be shifted.
						// If you delete only page 5, then this should be page 5, which should be shifted onto page 4.
						// If you delete only pages 1, 2, and 5, then this should be page 3, as pages 1 and 2 can't be shifted onto any earlier non-deleted pages.
						$gte: Math.max(firstNonDeletedPageID, firstDeletedPageID)
					}
				}, [{
					$set: {
						[`storySaves.${story._id}`]: {
							$subtract: [`$storySaves.${story._id}`, (
								deletedBeforeThisPage === 1
									// If only one page was deleted, then using a `$switch` is unnecessary. Also, there would be zero `branches`, which causes MongoDB to throw an error.
									? 1
									: {
										$switch: {
											branches,
											// If none of the `branches` are the case, then the page that the user has saved is after or on the last deleted page, so the amount that should be subtracted from the saved page ID is the number of total deleted pages.
											default: deletedBeforeThisPage
										}
									}
							)]
						}
					}
				}])
			);
		}

		// If page 1 is deleted, then there may be saves for this story on page 1 (or on consecutive deleted pages immediately after page 1) which can't be shifted onto an earlier non-deleted page. These saves should instead be deleted.
		if (firstDeletedPageID === 1) {
			storySaveUpdates.push(
				users.updateMany({
					[`storySaves.${story._id}`]: (
						firstNonDeletedPageID
							// Delete all saved pages that are within the consecutive deleted pages at the beginning of this story.
							? { $lt: firstNonDeletedPageID }
							// If there are no non-deleted pages left, all saves for this story must be deleted.
							: { $exists: true }
					)
				}, {
					// The reason we don't simply shift these saves onto page 1 in the previous update query using `$max: [1, ...]` is that, if every page in a story is deleted, then page 1 does not exist, and saves on page 1 would be invalid.
					$unset: {
						[`storySaves.${story._id}`]: true
					}
				})
			);
		}
	}

	// Await users' story saves to be adjusted before deleting any pages. Otherwise, a story save could reference a deleted page for a very short time before story saves finish updating.
	await Promise.all(storySaveUpdates);

	await updateStorySchedule(story, updateQuery);

	res.status(204).end();
};

export default Handler;