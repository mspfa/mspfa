import './styles.module.scss';
import DOMPurify from 'isomorphic-dompurify';
import parse, { domToReact } from 'html-react-parser';
import { Element } from 'domhandler';
import type { HTMLReactParserOptions } from 'html-react-parser';
import type { BBTagProps } from 'components/BBCode/BBTag';
import BBTag from 'components/BBCode/BBTag';

export type BBCodeProps = {
	/** Whether HTML should be allowed and parsed. */
	html?: boolean,
	children?: string
};

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

			if (rawAttributes.length) {
				if (rawAttributes[0] === '=') {
					attributes = rawAttributes.slice(1);
				} else {
					attributes = {};

					// Even though we only use the first attribute's capture groups, it is necessary to match additional ones to prevent the first attribute from capturing
					const attributeTest = /^(([\w-]+)=(["']?)(.*?)\3)(?: [\w-]+=(["']?).*?\5)*$/;

					let match: RegExpExecArray | null;

					while (match = attributeTest.exec(rawAttributes)) {
						const [, rawAttribute, attributeName, , attributeValue] = match;

						attributes[attributeName] = attributeValue;

						// Slice off this attribute from the original string, as well as the trailing space.
						rawAttributes = rawAttributes.slice(rawAttribute.length + 1);
					}
				}
			}

			return (
				<BBTag
					tagName={tagName}
					attributes={attributes}
				>
					{domToReact(domNode.children, parseOptions)}
				</BBTag>
			);
		}
	}
};

/** A component which parses its `children` string as BBCode. */
const BBCode = ({
	html,
	children = ''
}: BBCodeProps) => {
	/** The final string. */
	let htmlString = '';

	// Even though we don't use the contents of the second capturing group in this regular expression, it is necessary that it is so specific so that a tag with a "]" in its attributes does not stop matching early.
	const openTagTest = /\[([\w-]+)((?:=(["']?).*?\3)|(?: [\w-]+=(["']?).*?\4)+)?\]/;

	let match: RegExpExecArray | null;

	while (match = openTagTest.exec(children)) {
		const [tag, tagName, props] = match;

		// Append the slice of the original string from the end of the previous match to the start of this match.
		htmlString += children.slice(0, match.index);

		// Remove everything up to the end of this match from the original string.
		children = children.slice(match.index + tag.length);

		htmlString += `<mspfa-bb data-name="${tagName}" data-attributes="${props ? props.trim().replace(/"/g, '&quot;') : ''}">`;

		// Replace the next closing tag. It doesn't matter if it corresponds to the matched opening tag; valid BBCode will have the same number of opening tags as closing tags.
		children = children.replace(`[/${tagName}]`, '</mspfa-bb>');
		// The reason it is better to slice off processed portions of the original string is so this replacement doesn't have to scan unnecessary content.
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