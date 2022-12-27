import type { StoryPageID } from 'lib/server/stories';

/** Returns a user-friendly string describing the set of inputted page IDs. */
const getPagesString = (pageIDs: StoryPageID[]) => {
	pageIDs = [...pageIDs].sort((a, b) => a - b);

	/** An array of objects representing closed intervals of page IDs. */
	const pageRanges: Array<{
		/** The lower bound of this interval. */
		start: StoryPageID,
		/** The upper bound of this interval. */
		end: StoryPageID
	}> = [];

	/** The page ID most recently added to `pageRanges`. */
	let lastPageID: StoryPageID | undefined;

	for (const pageID of pageIDs) {
		// Check whether this page is adjacent to the previous.
		if (lastPageID === pageID - 1) {
			// Add this page to the last page range.
			pageRanges[pageRanges.length - 1].end = pageID;
		} else {
			// Add this page to a new page range.
			pageRanges.push({ start: pageID, end: pageID });
		}

		lastPageID = pageID;
	}

	/** An array of strings representing closed intervals of selected page IDs. */
	const rangeStrings = pageRanges.map(({ start, end }) => (
		start === end
			? `p${start}`
			: `p${start}-${end}`
	));

	if (rangeStrings.length === 1) {
		return rangeStrings[0];
	}

	const lastRangeStringIndex = rangeStrings.length - 1;
	rangeStrings[lastRangeStringIndex] = 'and ' + rangeStrings[lastRangeStringIndex];

	if (rangeStrings.length === 2) {
		return rangeStrings.join(' ');
	}

	return rangeStrings.join(', ');
};

export default getPagesString;
