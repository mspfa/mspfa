import type { DateNumber } from 'lib/types';

/** Returns a boolean for whether it should be disallowed for a page with the first argument's `published` date to be before a page with the second argument's `published` date. */
const invalidPublishedOrder = (
	firstPublished: DateNumber | Date | undefined,
	secondPublished: DateNumber | Date | undefined,
	/** The current date number. Defaults to `Date.now()`. */
	now = Date.now()
) => {
	const firstPublishedNumber = +(firstPublished ?? Infinity);
	const secondPublishedNumber = +(secondPublished ?? Infinity);

	return (
		// Check if the previous page is unpublished. On the other hand, if the previous page is published, we don't care when this page is being published.
		firstPublishedNumber > now
		// Check if this page would be published before the previous page (which shouldn't be allowed since it would allow for gaps in published pages).
		&& secondPublishedNumber < firstPublishedNumber
	);
};

export default invalidPublishedOrder;