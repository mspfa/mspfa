import { shortMonthNames, shortWeekDayNames, twoDigits } from 'lib/client/dates';
import escapeAngleBrackets from 'lib/client/escapeAngleBrackets';
import replaceAll from 'lib/client/replaceAll';
import StoryPrivacy from 'lib/client/StoryPrivacy';
import type { MyGetServerSideProps } from 'lib/server/pages';
import getStoryByUnsafeID from 'lib/server/stories/getStoryByUnsafeID';

const Component = () => null;

export default Component;

/** Escapes ampersands and angle brackets for use in XML. */
const escapeForXML = (string: string) => (
	escapeAngleBrackets(replaceAll(string, '&', '&amp;'))
);

const getRFC2822Timestamp = (date: Date) => (
	shortWeekDayNames[date.getUTCDay()]
	+ ', '
	+ twoDigits(date.getUTCDate())
	+ ' '
	+ shortMonthNames[date.getUTCMonth()]
	+ ' '
	+ `000${date.getUTCFullYear()}`.slice(-4)
	+ ' '
	+ [
		date.getUTCHours(),
		date.getUTCMinutes(),
		date.getUTCSeconds()
	].map(twoDigits).join(':')
	+ ' GMT'
);

export const getServerSideProps: MyGetServerSideProps = async ({ res, params }) => {
	const story = await getStoryByUnsafeID(params.storyID);

	res.setHeader('Content-Type', 'text/xml');

	res.write('<?xml version="1.0" encoding="UTF-8"?>');
	res.write('<rss version="2.0">');
	res.write('<channel>');

	if (!story) {
		res.statusCode = 404;

		res.write('<title>Error 404</title>');
		res.write(`<link>https://mspfa.com/?s=${encodeURIComponent(params.storyID!)}</link>`);
		res.write('<description>Adventure not found.</description>');
	}

	if (story) {
		if (story.privacy === StoryPrivacy.Private) {
			res.statusCode = 403;

			res.write('<title>Error 403</title>');
			res.write(`<link>https://mspfa.com/?s=${story._id}</link>`);
			res.write('<description>This adventure is private.</description>');
		} else {
			// The story exists and is not private.

			res.write(`<title>${escapeForXML(story.title)}</title>`);
			res.write(`<link>https://mspfa.com/?s=${story._id}</link>`);
			res.write(`<description>${escapeForXML(story.description)}</description>`);
			res.write(`<pubDate>${getRFC2822Timestamp(story.updated)}</pubDate>`);
			res.write(`<lastBuildDate>${getRFC2822Timestamp(story.updated)}</lastBuildDate>`);

			if (story.icon) {
				res.write('<image>');
				res.write(`<url>${escapeForXML(story.icon)}</url>`);
				res.write(`<title>${escapeForXML(story.title)}</title>`);
				res.write(`<link>https://mspfa.com/?s=${story._id}</link>`);
				res.write('</image>');
			}

			const oneWeekAgo = Date.now() - 1000 * 60 * 60 * 24 * 7;

			// Start iterating from the public page count to exclude drafts and scheduled pages.
			for (let i = story.pageCount; i >= 1; i--) {
				const endPage = story.pages[i];
				const endPagePublished = +endPage.published!;

				// Stop iterating when we reach pages that are too old.
				// We limit by publish date instead of item count because, otherwise, if an author publishes more items in a single update than the limit allows, then some of them would never appear in this channel, so RSS users would never see them in their feed.
				if (endPagePublished < oneWeekAgo) {
					break;
				}

				if (endPage.unlisted || endPage.silent) {
					continue;
				}

				/** The earliest page which was published at the same time as `endPage`. */
				let startPage = endPage;

				// Determine the `startPage`.
				while (i > 1) {
					const earlierPage = story.pages[i - 1];

					if (+earlierPage.published! !== endPagePublished) {
						break;
					}

					if (!(earlierPage.unlisted || earlierPage.silent)) {
						startPage = earlierPage;
					}

					i--;
				}

				res.write('<item>');
				res.write('<title>');
				res.write(
					startPage === endPage
						? `Page ${startPage.id}`
						: `Pages ${startPage.id}-${endPage.id}`
				);
				res.write('</title>');
				res.write(`<link>https://mspfa.com/?s=${story._id}&amp;p=${startPage.id}</link>`);
				res.write(`<description>${escapeForXML(startPage.title)}</description>`);
				res.write(`<guid isPermaLink="true">https://mspfa.com/?s=${story._id}&amp;p=${startPage.id}</guid>`);
				res.write(`<pubDate>${getRFC2822Timestamp(startPage.published!)}</pubDate>`);
				res.write('</item>');
			}
		}
	}

	res.write('</channel>');
	res.end('</rss>');

	return { props: {} };
};