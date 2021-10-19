import { shortMonthNames, shortWeekDayNames, twoDigits } from 'lib/client/dates';
import escapeAngleBrackets from 'lib/client/escapeAngleBrackets';
import replaceAll from 'lib/client/replaceAll';
import { StoryPrivacy } from 'lib/client/stories';
import type { MyGetServerSideProps } from 'lib/server/pages';
import { getStoryByUnsafeID } from 'lib/server/stories';

const Component = () => null;

export default Component;

/** Escapes ampersands and angle brackets for use in XML. */
const escapeForXML = (string: string) => (
	escapeAngleBrackets(replaceAll(string, '&', '&amp;'))
);

const getRFC2822Timestamp = (date: Date) => (
	`${
		shortWeekDayNames[date.getUTCDay()]
	}, ${
		twoDigits(date.getUTCDate())
	} ${
		shortMonthNames[date.getUTCMonth()]
	} ${
		`000${date.getUTCFullYear()}`.slice(-4)
	} ${
		[
			date.getUTCHours(),
			date.getUTCMinutes(),
			date.getUTCSeconds()
		].map(twoDigits).join(':')
	} GMT`
);

export const getServerSideProps: MyGetServerSideProps = async ({ res, params }) => {
	const story = await getStoryByUnsafeID(params.storyID);

	res.setHeader('Content-Type', 'text/xml');

	let rssString = '<?xml version="1.0" encoding="UTF-8"?>';
	rssString += '<rss version="2.0">';
	rssString += '<channel>';

	if (!story) {
		res.statusCode = 404;
	}

	if (story) {
		if (story.privacy === StoryPrivacy.Private) {
			res.statusCode = 403;

			rssString += '<title>Error 403</title>';
			rssString += `<link>https://mspfa.com/?s=${story._id}</link>`;
			rssString += '<description>This adventure is private.</description>';
		} else {
			// The story exists and is not private.

			rssString += `<title>${escapeForXML(story.title)}</title>`;
			rssString += `<link>https://mspfa.com/?s=${story._id}</link>`;
			rssString += `<description>${escapeForXML(story.description)}</description>`;
			rssString += `<pubDate>${getRFC2822Timestamp(story.updated)}</pubDate>`;
			rssString += `<lastBuildDate>${getRFC2822Timestamp(story.updated)}</lastBuildDate>`;

			if (story.icon) {
				rssString += '<image>';
				rssString += `<url>${escapeForXML(story.icon)}</url>`;
				rssString += `<title>${escapeForXML(story.title)}</title>`;
				rssString += `<link>https://mspfa.com/?s=${story._id}</link>`;
				rssString += '</image>';
			}

			const oneWeekAgo = Date.now() - (1000 * 60 * 60 * 24 * 7);

			// Start iterating from the public page count to exclude drafts and scheduled pages.
			for (let i = story.pageCount; i >= 1; i--) {
				const page = story.pages[i];

				// Stop iterating when we reach pages that are too old.
				// We limit by publish date instead of page count because, otherwise, if an author publishes more pages in a single update than the limit allows, then some of them would never appear in this channel, so RSS users would never see them in their feed.
				if (+page.published! < oneWeekAgo) {
					break;
				}

				if (!page.unlisted) {
					rssString += '<item>';
					rssString += `<title>Page ${page.id}</title>`;
					rssString += `<link>https://mspfa.com/?s=${story._id}&amp;p=${page.id}</link>`;
					rssString += `<description>${escapeForXML(page.title)}</description>`;
					rssString += `<guid isPermaLink="true">https://mspfa.com/?s=${story._id}&amp;p=${page.id}</guid>`;
					rssString += `<pubDate>${getRFC2822Timestamp(page.published!)}</pubDate>`;
					rssString += '</item>';
				}
			}
		}
	}

	rssString += '</channel>';
	rssString += '</rss>';

	res.end(rssString);

	return { props: {} };
};