import processNoparseTags from 'lib/client/parseBBCode/processNoparseTags';
import type { SanitizeBBCodeOptions } from 'lib/client/parseBBCode/sanitizeBBCode';
import sanitizeBBCode from 'lib/client/parseBBCode/sanitizeBBCode';
import type { ParseBBCodeInNodeOptions } from 'lib/client/parseBBCode/parseBBCodeInNode';
import parseBBCodeInNode from 'lib/client/parseBBCode/parseBBCodeInNode';

export type ParseBBCodeOptions = SanitizeBBCodeOptions & ParseBBCodeInNodeOptions;

/** Sanitizes and parses a string containing HTML and BBCode. Returns a `ReactNode` of the parsed BBCode. */
const parseBBCode = (
	bbString: string,
	{ removeBBTags, ...sanitizeOptions }: ParseBBCodeOptions
) => {
	// Optimize for the common case of the input being empty.
	if (bbString === '') {
		return '';
	}

	return parseBBCodeInNode(
		sanitizeBBCode(
			// `noparse` tags must be processed before sanitization occurs to avoid the sanitizer transforming HTML that should be escaped in `noparse` tags.
			processNoparseTags(bbString),
			sanitizeOptions
		),
		{ removeBBTags }
	);
};

export default parseBBCode;