import './styles.module.scss';
import DOMPurify from 'isomorphic-dompurify';
import parse, { domToReact } from 'html-react-parser';
import type { HTMLReactParserOptions } from 'html-react-parser';
import { Element } from 'domhandler';
import BBTags from 'components/BBCode/BBTags';
import type { BBTagProps } from 'components/BBCode/BBTags';
import React from 'react';
import type { integer } from 'lib/types';

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

/** A key of an opening tag match array that maps to the index of the opening tag in the output `htmlString`. */
const _htmlIndex = Symbol('htmlIndex');

type BBTagMatch = RegExpExecArray & {
	[_htmlIndex]: integer
};

type SanitizeBBCodeOptions = {
	/** Whether HTML should be allowed and parsed. */
	html?: boolean,
	/** Whether to blacklist all BBCode from the sanitized HTML. */
	noBB?: boolean
};

export const sanitizeBBCode = (
	bbString = '',
	{ html, noBB }: SanitizeBBCodeOptions = {}
) => {
	// Optimize for the common case of the input being empty.
	if (bbString === '') {
		return '';
	}

	/** The resulting HTML string to be sanitized and parsed. */
	let htmlString = '';

	/** A record that maps each BBCode tag name to an ordered array of opening tag matches. */
	const openTagMatches: Record<string, BBTagMatch[]> = {};

	// Even if we didn't use the attributes matched in this regular expression, it would still be necessary to specifically match them so that a tag with `]` in its attributes does not end early.
	/** A regular expression which matches opening or closing BB tags, for example `[color=red]`, `[/spoiler]`, or `[this-is-not-a-real-tag]`. */
	const tagTest = /\[(?:([\w-]+)((?:=(["']?)(.*?)\3)|(?: [\w-]+=(["']?).*?\5)+)?|\/([\w-]+))\]/g;

	/** The index at the end of the previous match, or of the start of the string if there is no previous match. */
	let matchEndIndex = 0;

	let match;
	while (match = tagTest.exec(bbString) as BBTagMatch | null) {
		/** The full matched tag string, for example `[color=red]`, `[/spoiler]`, or `[this-is-not-a-real-tag]`. */
		const tag = match[0];
		/** Whether the matched tag is an opening tag and not a closing tag. */
		const open = match[6] as string | undefined === undefined;
		/** The name of the matched tag. */
		const tagName = match[open ? 1 : 6].toLowerCase();

		// Append the slice of the BB string from the end of the previous match to the start of this match.
		htmlString += bbString.slice(matchEndIndex, match.index);

		matchEndIndex = tagTest.lastIndex;

		if (open && tagName === 'noparse') {
			const closeTagIndex = bbString.toLowerCase().indexOf('[/noparse]', matchEndIndex);

			// Check if this `noparse` tag has a respective closing tag after it.
			if (closeTagIndex !== -1) {
				// Append this tag's children, with HTML escaped.
				htmlString += (
					bbString.slice(matchEndIndex, closeTagIndex)
						.replace(/&/g, '&amp;')
						.replace(/</g, '&lt;')
						.replace(/>/g, '&gt;')
				);

				// Skip to the end of the closing `noparse` tag.
				matchEndIndex = closeTagIndex + '[/noparse]'.length;
				tagTest.lastIndex = matchEndIndex;

				continue;
			}
		}

		const BBTag = BBTags[tagName];

		if (BBTag) {
			// The matched tag is a real tag.

			if (open) {
				// The matched tag is an opening tag.

				if (!(tagName in openTagMatches)) {
					openTagMatches[tagName] = [];
				}
				openTagMatches[tagName].push(match);

				match[_htmlIndex] = htmlString.length;

				// Add the matched tag to the output string, possibly to be replaced later if its respective closing tag is found.
				htmlString += tag;
			} else {
				// The matched tag is a closing tag.

				/** The respective opening tag before this matched closing tag. */
				const openTagMatch = (
					tagName in openTagMatches
						? openTagMatches[tagName].pop()
						: undefined
				);
				if (openTagMatch) {
					// The closing tag has a respective opening tag.

					/** The converted HTML string of this tag's opening, children, and closing. */
					let htmlTag = `<mspfa-bb data-name="${tagName}"`;

					/** If the opening tag is in the format `[tag=value]`, this is a string of the `value`. Otherwise, undefined (e.g. if the opening tag is in the format `[tag key=value]`). */
					const rawAttributesAfterEqualSign = openTagMatch[4] as string | undefined;

					if (rawAttributesAfterEqualSign) {
						htmlTag += ` data-attr="${rawAttributesAfterEqualSign.replace(/"/g, '&quot;')}"`;
					} else {
						let rawAttributes = openTagMatch[2] as string | undefined;

						if (rawAttributes) {
							// Even though we only use the first attribute's capture groups, it is necessary to match additional attributes to prevent the first attribute's capture group from ending early.
							const attributeTest = /^( ([\w-]+)=(["']?)(.*?)\3)(?: [\w-]+=(["']?).*?\5)*$/;

							let attributeMatch;
							while (attributeMatch = attributeTest.exec(rawAttributes)) {
								const [, rawAttribute, attributeName, , attributeValue] = attributeMatch;

								htmlTag += ` data-attr-${attributeName}="${attributeValue.replace(/"/g, '&quot;')}"`;

								// Slice off this attribute from the original string.
								rawAttributes = rawAttributes.slice(rawAttribute.length);
								// Slicing off processed portions of the original string is necessary because, otherwise, adding the `g` flag to `attributeTest` would set `attributeTest.lastIndex` to the end of the string after the first iteration, since `attributeTest`'s match includes the end of the string.
							}
						}
					}

					htmlTag += '>';

					/** The full open tag string, for example `[color=red]` or `[spoiler]`. */
					const openTag = openTagMatch[0];

					// Append this tag's children.
					htmlTag += (
						// Slice from `htmlString` instead of `bbString` because there may already be processed BB tags in this tag's children.
						htmlString.slice(
							// The index at end of the opening tag.
							openTagMatch[_htmlIndex] + openTag.length
							// Since we are closing this tag at the current index, we know the end of the `htmlString` is the end of this tag's children, so the slice should go to the end of the `htmlString`.
						)
					);

					// Discard opening BB tags which are still unclosed within this tag's children.
					for (const matches of Object.values(openTagMatches)) {
						const lastMatch = matches[matches.length - 1] as BBTagMatch | undefined;
						while (lastMatch && lastMatch.index > openTagMatch.index) {
							matches.pop();
						}
					}

					htmlTag += '</mspfa-bb>';

					// If this tag is a block element followed by a line break, skip the line break since there is already a break after block elements naturally. This allows for more intuitive line breaking behavior for the user.
					if (
						BBTag.withBlock
						&& bbString[matchEndIndex] === '\n'
					) {
						matchEndIndex++;
					}

					// Remove this BB tag from the output string and add its processed HTML.
					htmlString = htmlString.slice(0, openTagMatch[_htmlIndex]) + htmlTag;
				} else {
					// The closing tag does not have a respective opening tag.

					htmlString += tag;
				}
			}
		} else {
			// The matched tag is not a real tag.

			htmlString += tag;
		}
	}

	// Append the rest of the input string.
	htmlString += bbString.slice(matchEndIndex);

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

export type BBCodeProps = SanitizeBBCodeOptions & {
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