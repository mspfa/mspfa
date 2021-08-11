import './styles.module.scss';
import DOMPurify from 'isomorphic-dompurify';
import parse, { domToReact } from 'html-react-parser';
import type { HTMLReactParserOptions } from 'html-react-parser';
import { Element } from 'domhandler';
import BBTags from 'components/BBCode/BBTags';
import type { BBTagProps } from 'components/BBCode/BBTags';
import React from 'react';

const parseOptions: HTMLReactParserOptions = {
	replace: domNode => {
		if (
			domNode instanceof Element
			&& domNode.type === 'tag'
			&& domNode.name === 'mspfa-bb'
		) {
			let tagName: string | undefined;
			let attributes: BBTagProps['attributes'];

			// Note that, because the client can input a string with `mspfa-bb` HTML tags already in it, the attributes of the `mspfa-bb` tag cannot be trusted.

			for (let i = 0; i < domNode.attributes.length; i++) {
				const { name, value } = domNode.attributes[i];

				if (name === 'data-name') {
					tagName = value;
				} else if (name === 'data-attr') {
					attributes = value;
				} else {
					if (!(attributes instanceof Object)) {
						attributes = {};
					}

					attributes[name.slice('data-attr-'.length)] = value;
				}
			}

			if (!tagName) {
				return;
			}

			const BBTag = BBTags[tagName];

			if (!BBTag) {
				return;
			}

			return (
				<BBTag attributes={attributes}>
					{domToReact(domNode.children, parseOptions)}
				</BBTag>
			);
		}
	}
};

export const sanitizeBBCode = (bbString = '', { html, noBB }: {
	/** Whether HTML should be allowed and parsed. */
	html?: boolean,
	/** Whether to blacklist all BBCode from the sanitized HTML. */
	noBB?: boolean
} = {}) => {
	// Optimize for the common case of the input being empty.
	if (bbString === '') {
		return '';
	}

	/** The resulting HTML string to be sanitized and parsed. */
	let htmlString = '';

	// Even though we don't use the contents of the second capturing group in this regular expression, it is necessary that it is so specific so a tag with "]" in its attributes does not end early.
	const openTagTest = /\[([\w-]+)((?:=(["']?)(.*?)\3)|(?: [\w-]+=(["']?).*?\5)+)?\]/;

	let match: RegExpExecArray | null;

	while (match = openTagTest.exec(bbString)) {
		const openTag = match[0];
		const tagName = match[1].toLowerCase();

		// Append the slice of the original string from the end of the previous match to the start of this match.
		htmlString += bbString.slice(0, match.index);

		// Remove everything up to the end of this match from the original string.
		bbString = bbString.slice(match.index + openTag.length);

		const BBTag = BBTags[tagName];

		if (BBTag) {
			htmlString += `<mspfa-bb data-name="${tagName}"`;

			const rawAttributesAfterEqualSign: string | undefined = match[4];

			if (rawAttributesAfterEqualSign) {
				htmlString += ` data-attr="${rawAttributesAfterEqualSign.replace(/"/g, '&quot;')}"`;
			} else {
				let rawAttributes: string | undefined = match[2];

				// Even though we only use the first attribute's capture groups, it is necessary to match additional attributes to prevent the first attribute's capture group from ending early.
				const attributeTest = /^( ([\w-]+)=(["']?)(.*?)\3)(?: [\w-]+=(["']?).*?\5)*$/;

				let attributeMatch: RegExpExecArray | null;

				while (attributeMatch = attributeTest.exec(rawAttributes)) {
					const [, rawAttribute, attributeName, , attributeValue] = attributeMatch;

					htmlString += ` data-attr-${attributeName}="${attributeValue.replace(/"/g, '&quot;')}"`;

					// Slice off this attribute from the original string.
					rawAttributes = rawAttributes.slice(rawAttribute.length);
					// Slicing off processed portions of the original string is necessary because, otherwise, adding the `g` flag to `attributeTest` would set `attributeTest.lastIndex` to the end of the string after the first iteration, since `attributeTest`'s match includes the end of the string.
				}
			}

			htmlString += '>';

			// Replace the next closing tag. It doesn't matter if it corresponds to the matched opening tag; valid BBCode will have the same number of opening tags as closing tags.
			bbString = bbString.replace(
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
	htmlString += bbString;

	return DOMPurify.sanitize(
		htmlString,
		{
			// Allow external protocol handlers in URL attributes.
			ALLOW_UNKNOWN_PROTOCOLS: true,
			// Prevent unintuitive browser behavior in several edge cases.
			FORCE_BODY: true,
			// Disable DOM clobbering protection on output.
			SANITIZE_DOM: false,
			...html ? {
				ADD_TAGS: ['mspfa-bb', 'iframe'],
				ADD_ATTR: [
					// Allow `iframe` attributes.
					'allow', 'allowfullscreen', 'allowpaymentrequest', 'csp', 'referrerpolicy', 'sandbox', 'srcdoc', 'frameborder', 'marginheight', 'marginwidth', 'scrolling'
				]
			} : {
				ALLOWED_TAGS: noBB ? [] : ['mspfa-bb']
			}
		}
	);
};

export type BBCodeProps = {
	/** Whether HTML should be allowed and parsed. */
	html?: boolean,
	/** Whether to blacklist all BBCode. */
	noBB?: boolean,
	/** Whether the input has already been sanitized and no sanitization should be performed by this component. */
	alreadySanitized?: boolean,
	/** The original input BBCode string. */
	children?: string
};

/** A component which parses its `children` string as BBCode. */
const BBCode = ({
	html,
	noBB,
	alreadySanitized,
	children: htmlString = ''
}: BBCodeProps) => {
	if (!alreadySanitized) {
		htmlString = sanitizeBBCode(htmlString, { html, noBB });
	}

	return (
		<span className="bb">
			{(htmlString === '' || (noBB && !html)
				// If `htmlString` is empty or BBCode and HTML are both disabled, then the `htmlString` can be treated as plain text as an optimization.
				? htmlString
				: parse(htmlString, parseOptions)
			)}
		</span>
	);
};

export default BBCode;