import type { DateNumber } from 'lib/types';

type PublishedValue = DateNumber | Date | undefined;
type PublishedParameter = PublishedValue | { published?: PublishedValue };

const getPublishedDateNumber = (published: PublishedParameter) => {
	if (published instanceof Object && !(published instanceof Date)) {
		published = published.published;
	}

	if (published === undefined) {
		return Infinity;
	}

	return +published;
};

/** Returns a boolean for whether it should be disallowed for a page with the first argument's `published` date to be before a page with the second argument's `published` date. */
const invalidPublishedOrder = (
	firstPublished: PublishedParameter,
	secondPublished: PublishedParameter,
	/** The current date number. Defaults to `Date.now()`. */
	now = Date.now()
) => {
	firstPublished = getPublishedDateNumber(firstPublished);
	secondPublished = getPublishedDateNumber(secondPublished);

	return (
		// Check if the previous page is unpublished. On the other hand, if the previous page is published, we don't care when this page is being published.
		firstPublished > now
		// Check if this page would be published before the previous page (which shouldn't be allowed since it would allow for gaps in published pages).
		&& secondPublished < firstPublished
	);
};

export default invalidPublishedOrder;
