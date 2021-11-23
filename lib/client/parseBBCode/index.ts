import processNoparseTags from 'lib/client/parseBBCode/processNoparseTags';
import type { SanitizeBBCodeOptions } from 'lib/client/parseBBCode/sanitizeBBCode';
import sanitizeBBCode from 'lib/client/parseBBCode/sanitizeBBCode';
import type { ParseNodeOptions } from 'lib/client/parseBBCode/parseNode';
import parseNode from 'lib/client/parseBBCode/parseNode';
import markHTMLEntities from 'lib/client/parseBBCode/markHTMLEntities';

export type ParseBBCodeOptions<RemoveBBTags extends boolean | undefined = boolean | undefined> = (
	SanitizeBBCodeOptions & ParseNodeOptions<RemoveBBTags>
);

/** Sanitizes and parses a string containing HTML and BBCode. Returns a `ParsedReactNode` of the parsed BBCode. */
const parseBBCode = <RemoveBBTags extends boolean | undefined = undefined>(
	bbString: string,
	{ removeBBTags, ...sanitizeOptions }: ParseBBCodeOptions<RemoveBBTags> = {}
) => {
	// Optimize for the common case of the input being empty.
	if (bbString === '') {
		return '';
	}

	return parseNode(
		sanitizeBBCode(
			// HTML entities must be marked before sanitization occurs because all the information about the string's HTML entities is lost after sanitization as the sanitizer parses HTML entities into plain text.
			markHTMLEntities(
				// `noparse` tags must be processed before sanitization occurs to avoid the sanitizer transforming HTML that should be escaped in `noparse` tags.
				// `noparse` tags must also be processed before marking HTML entities because `noparse` tags create more HTML entities which would need to be marked.
				processNoparseTags(bbString)
			),
			sanitizeOptions
		),
		{ removeBBTags }
	);
};

export default parseBBCode;