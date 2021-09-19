import type { integer } from 'lib/types';
import type { Key, ReactNode, ReactNodeArray } from 'react';
import attributesToProps from 'lib/client/parseBBCode/attributesToProps';
import type { BBTagProps } from 'components/BBCode/BBTags';
import BBTags from 'components/BBCode/BBTags';

// We use char codes instead of 1-character strings in many cases because it's generally faster in the V8 engine (which is what the server runs on).
const SPACE_CHAR_CODE = 32;
const FORWARD_SLASH_CHAR_CODE = 47;
const EQUAL_SIGN_CHAR_CODE = 61;
const LEFT_SQUARE_BRACKET_CHAR_CODE = 93;
const LOWERCASE_A_CHAR_CODE = 97;
const LOWERCASE_Z_CHAR_CODE = 122;

/** Returns whether `element instanceof HTMLElement`. */
const isHTMLElement = (element: Element): element is HTMLElement => {
	if (element.ownerDocument.defaultView) {
		return element instanceof element.ownerDocument.defaultView.HTMLElement;
	}

	let prototype = element;
	while (prototype = Object.getPrototypeOf(prototype)) {
		if (prototype.constructor.name === 'HTMLElement') {
			return true;
		}
	}
	return false;
};

/** Returns whether `node instanceof Text`. */
const isTextNode = (node: Node): node is Text => (
	node.nodeType === 3
);

/** Returns whether `node instanceof DocumentFragment`. */
const isDocumentFragmentNode = (node: Node): node is DocumentFragment => (
	node.nodeType === 11
);

/** Returns whether `node instanceof HTMLTextAreaElement`. */
const isHTMLTextAreaElement = (node: Node): node is HTMLTextAreaElement => (
	node.nodeName === 'TEXTAREA'
);

export type ParseNodeOptions<RemoveBBTags extends boolean | undefined = boolean | undefined> = {
	/** Whether to strip all BB tags from the input and keep only their children. */
	removeBBTags?: RemoveBBTags
};

/**
 * Returns a `ReactNode` representation of the input, with the inputted string or child nodes parsed as BBCode recursively.
 *
 * ⚠️ Assumes the input is already sanitized.
 */
const parseNode = <
	KeepHTMLTags extends boolean | undefined = undefined,
	RemoveBBTags extends boolean | undefined = undefined
>(
	node: string | DocumentFragment | Element,
	options: ParseNodeOptions<RemoveBBTags>,
	key: Key = 0
): (
	KeepHTMLTags extends true
		? ReactNode
		: RemoveBBTags extends true
			? string
			: ReactNode
) => {
	/** Parses a string as partial BBCode. (It's partial if this string is from only one of the `node`'s child text nodes, and other child text nodes contain the rest of the BBCode.) */
	const parseString = (
		/** The string to parse BBCode within. */
		string: string,
		/** The index of this child in its parent's children, or 0 if this string is not a child. Defaults to 0. */
		index: integer = 0
	) => {
		let openBracketIndex;
		/** The index at the end of the previous match, or of the start of the string if there is no previous match. */
		let matchEndIndex = 0;

		while ((
			openBracketIndex = string.indexOf('[', matchEndIndex)
		) !== -1) {
			matchEndIndex = openBracketIndex + 1;

			/** The index of the next closing bracket. Does not necessarily correspond to this tag's opening bracket, for example if it's escaped or inside a quoted attribute. */
			let closeBracketIndex = string.indexOf(']', matchEndIndex);

			if (closeBracketIndex === -1) {
				// If there are no more closing brackets after this opening bracket, then there are no more valid BB tags, so stop searching for them.
				break;
			}

			/** Whether this tag is a closing tag (e.g. `[/tag]`) rather than an opening tag (e.g. `[tag]`). */
			let isClosingTag = false;

			/** The lowercase name of this tag (e.g. `'tag'` if the tag is `[Tag example=1]`.) */
			let tagName = '';

			/** Equal to `string.charCodeAt(matchEndIndex)`. */
			let charCodeAtMatchEndIndex = string.charCodeAt(matchEndIndex);

			if (charCodeAtMatchEndIndex === FORWARD_SLASH_CHAR_CODE) {
				isClosingTag = true;

				// Move past the forward slash.
				matchEndIndex++;

				charCodeAtMatchEndIndex = string.charCodeAt(matchEndIndex);
			}

			// There is no need to be concerned about this loop reaching the end of the string before it `break`s, because we've already verified above that there is another `]` character which it can break on before it reaches the end of the string.
			while (true) {
				// Turn on the bit in the char code that converts letters to lowercase.
				const lowerCaseCharCode = charCodeAtMatchEndIndex | 0b100000;

				if (
					lowerCaseCharCode < LOWERCASE_A_CHAR_CODE
					|| lowerCaseCharCode > LOWERCASE_Z_CHAR_CODE
				) {
					// This isn't a letter, so end the tag name.
					break;
				}

				// This is a letter, so add it to the tag name.
				tagName += String.fromCharCode(lowerCaseCharCode);

				// Prepare to check the next character.
				matchEndIndex++;
				charCodeAtMatchEndIndex = string.charCodeAt(matchEndIndex);
			}

			// TODO: Handle `noparse` tags.

			if (!(tagName && BBTags.hasOwnProperty(tagName))) {
				// This tag name does not represent a real BB tag.
				continue;
			}

			if (isClosingTag) {
				// Check if the closing bracket isn't immediately after the tag name.
				if (matchEndIndex !== closeBracketIndex) {
					// This closing tag is invalid as it does not end in a closing bracket.
					continue;
				}

				// Move past the closing bracket.
				matchEndIndex++;

				// TODO: Handle this valid closing tag.
			} else {
				// This is an opening tag.

				let attributes: BBTagProps['attributes'];

				// Check the character immediately after the tag name.
				if (matchEndIndex === closeBracketIndex) {
					// This tag closes immediately after the tag name. Move past the closing bracket.
					matchEndIndex++;
				} else if (charCodeAtMatchEndIndex === EQUAL_SIGN_CHAR_CODE) {
					// Parse this tag's attribute.

					// Move past the equal sign.
					matchEndIndex++;

					const charAfterEqualSign = string[matchEndIndex];

					if (charAfterEqualSign === '"' || charAfterEqualSign === '\'') {
						// Move past the quotation mark or apostrophe.
						matchEndIndex++;

						const attributeValueEndIndex = string.indexOf(charAfterEqualSign, matchEndIndex);

						// Expect there to be a closing bracket immediately after the attribute ends.
						closeBracketIndex = attributeValueEndIndex + 1;

						if (
							// Check if this tag's attribute has an opening delimiter but no closing delimiter.
							attributeValueEndIndex === -1
							// Check if this tag doesn't close immediately after its attribute ends.
							|| string.charCodeAt(closeBracketIndex) !== LEFT_SQUARE_BRACKET_CHAR_CODE
						) {
							// This tag's attribute is invalid.
							continue;
						}

						attributes = string.slice(matchEndIndex, attributeValueEndIndex);
					} else {
						attributes = string.slice(matchEndIndex, closeBracketIndex);
					}

					// Move past the attribute and the closing bracket immediately following it.
					matchEndIndex = closeBracketIndex + 1;
				} else if (charCodeAtMatchEndIndex === SPACE_CHAR_CODE) {
					// Parse this tag's attributes.

					attributes = {};

					// TODO
				} else {
					// The character immediately following the tag name is invalid.
					continue;
				}

				console.log(tagName, attributes);

				// TODO: Handle this valid opening tag.
			}
		}
	};

	if (typeof node === 'string') {
		parseString(node);
		return node;
	}

	/** Returns a `Node`'s children as a `ReactNode` with parsed BBCode. */
	const parseNodeChildren = () => {
		const childrenArray: ReactNodeArray = [];

		for (let i = 0; i < node.childNodes.length; i++) {
			// We can assert this because any `ChildNode` is necessarily an `Element | Text | Comment`, and `Comment`s are sanitized out.
			const childNode = node.childNodes[i] as Element | Text;

			if (isTextNode(childNode)) {
				if (
					// Check if there is a previously pushed node.
					i > 0
					// Check if the previously pushed node is a string.
					&& typeof childrenArray[childrenArray.length - 1] === 'string'
				) {
					// If the previously pushed node is also a string, merge this one into it.
					childrenArray[childrenArray.length - 1] += childNode.nodeValue!;
				} else {
					// We're able to push the string without wrapping it in a fragment with a `key` because strings don't need React keys.
					childrenArray.push(childNode.nodeValue);
				}
			} else {
				// If this point is reached, `childNode instanceof Element`.
				childrenArray.push(
					parseNode(childNode, options, i)
				);
			}
		}

		return (
			childrenArray.length === 0
				? undefined
				: childrenArray.length === 1
					? childrenArray[0]
					: childrenArray
		);
	};

	if (isDocumentFragmentNode(node)) {
		return parseNodeChildren() as any;
	}

	const TagName: any = (
		isHTMLElement(node)
			// `HTMLElement`s have uppercase tag names, and React requires them to be lowercase.
			? node.nodeName.toLowerCase()
			// Other `Element`s (such as `SVGElement`s) may have case-sensitive tag names, so their case must not be modified.
			: node.nodeName
	);

	const props: ReturnType<typeof attributesToProps> & {
		children?: ReactNode
	} = attributesToProps(node);

	if (isHTMLTextAreaElement(node)) {
		// If this is a `textarea`, set its `defaultValue` instead of parsing its `children`.
		props.defaultValue = node.value;
	} else {
		// Otherwise, set its `children`.
		props.children = parseNodeChildren();
	}

	return (
		<TagName
			key={key}
			{...props}
		/>
	) as any;
};

export default parseNode;