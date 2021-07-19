import validate from './index.validate';
import type { APIHandler } from 'modules/server/api';
import type { StoryPage } from 'modules/server/stories';
import { getStoryByUnsafeID, getClientStoryPage, updateStorySchedule } from 'modules/server/stories';
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
			const newPage: StoryPage = {
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
			const pageChanges: RecursivePartial<StoryPage> = {
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

			// Convert the modified `StoryPage` to a `ClientStoryPage` to send back to the client.
			newClientPages[pageID] = getClientStoryPage(
				// Merge the changes in `pageChanges` into the original `StoryPage` to get what it would be after the changes.
				mergeWith(page, pageChanges, overwriteArrays)
			);
		}
	}

	const pageValues = Object.values(story.pages);
	for (let i = 1; i < pageValues.length; i++) {
		const page = pageValues[i];
		const published = +(page.published ?? Infinity);
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

	await updateStorySchedule(story, { $set, $unset });

	res.status(200).send(newClientPages);
};

export default Handler;