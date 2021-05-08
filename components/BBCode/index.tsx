import './styles.module.scss';
import DOMPurify from 'isomorphic-dompurify';
import parse, { domToReact } from 'html-react-parser';
import type { HTMLReactParserOptions } from 'html-react-parser';
import { Element } from 'domhandler';
import BBTags from 'components/BBCode/BBTags';
import type { BBTagProps } from 'components/BBCode/BBTags';

const parseOptions: HTMLReactParserOptions = {
	replace: domNode => {
		if (
			domNode instanceof Element
			&& domNode.type === 'tag'
			&& domNode.name === 'mspfa-bb'
			// `domNode.attributes` should be an array with the `data-name` and `data-attributes` HTML attribute objects (in no particular order), but we can't trust client data, so we must check.
			&& domNode.attributes.length === 2
		) {
			let tagName: string;
			let rawAttributes: string;
			let attributes: BBTagProps['attributes'];

			if (domNode.attributes[0].name === 'data-name') {
				tagName = domNode.attributes[0].value;
				rawAttributes = domNode.attributes[1].value;
			} else {
				rawAttributes = domNode.attributes[0].value;
				tagName = domNode.attributes[1].value;
			}

			const BBTag = BBTags[tagName];

			if (!BBTag) {
				return;
			}

			if (rawAttributes.length) {
				if (rawAttributes[0] === '=') {
					attributes = rawAttributes.slice(1);
				} else {
					attributes = {};

					// Even though we only use the first attribute's capture groups, it is necessary to match additional attributes to prevent the first attribute's capture group from ending early.
					const attributeTest = /^(([\w-]+)=(["']?)(.*?)\3)(?: [\w-]+=(["']?).*?\5)*$/i;

					let match: RegExpExecArray | null;

					while (match = attributeTest.exec(rawAttributes)) {
						const [, rawAttribute, attributeName, , attributeValue] = match;

						attributes[attributeName.toLowerCase()] = attributeValue;

						// Slice off this attribute from the original string, as well as the trailing space.
						rawAttributes = rawAttributes.slice(rawAttribute.length + 1);
					}
				}
			}

			return (
				<BBTag attributes={attributes}>
					{domToReact(domNode.children, parseOptions)}
				</BBTag>
			);
		}
	}
};

export type BBCodeProps = {
	/** Whether HTML should be allowed and parsed. */
	html?: boolean,
	/** The original input BBCode string. */
	children?: string
};

/** A component which parses its `children` string as BBCode. */
const BBCode = ({
	html,
	children = ''
}: BBCodeProps) => {
	/** The resulting HTML string to be sanitized and parsed. */
	let htmlString = '';

	// Even though we don't use the contents of the second capturing group in this regular expression, it is necessary that it is so specific so a tag with "]" in its attributes does not end early.
	const openTagTest = /\[([\w-]+)((?:=(["']?).*?\3)|(?: [\w-]+=(["']?).*?\4)+)?\]/i;

	let match: RegExpExecArray | null;

	while (match = openTagTest.exec(children)) {
		const openTag = match[0];
		const tagName = match[1].toLowerCase();
		const rawAttributes = match[2];

		// Append the slice of the original string from the end of the previous match to the start of this match.
		htmlString += children.slice(0, match.index);

		// Remove everything up to the end of this match from the original string.
		children = children.slice(match.index + openTag.length);

		const BBTag = BBTags[tagName];

		if (BBTag) {
			htmlString += `<mspfa-bb data-name="${tagName}" data-attributes="${rawAttributes ? rawAttributes.trim().replace(/"/g, '&quot;') : ''}">`;

			// Replace the next closing tag. It doesn't matter if it corresponds to the matched opening tag; valid BBCode will have the same number of opening tags as closing tags.
			children = children.replace(
				new RegExp(`\\[/${tagName}\\]${
					// If `BBTag` is a block element, we also want to remove one line break after its closing tag to promote intuitive line breaking behavior for the user.
					BBTag.withBlock ? '\\n?' : ''
				}`, 'i'),
				'</mspfa-bb>'
			);
			// The reason it is better to slice off processed portions of the original string is so this replacement doesn't have to scan unnecessary content.
		} else {
			htmlString += openTag;
		}
	}

	// Append the rest of the original string.
	htmlString += children;

	return (
		<span className="bbcode">
			{parse(
				DOMPurify.sanitize(
					htmlString,
					{
						// Allow external protocol handlers in URL attributes.
						ALLOW_UNKNOWN_PROTOCOLS: true,
						// Prevent unintuitive browser behavior in several edge cases.
						FORCE_BODY: true,
						// Disable DOM clobbering protection on output.
						SANITIZE_DOM: false,
						[html ? 'ADD_TAGS' : 'ALLOWED_TAGS']: ['mspfa-bb']
					}
				),
				parseOptions
			)}
		</span>
	);
};

export default BBCode;