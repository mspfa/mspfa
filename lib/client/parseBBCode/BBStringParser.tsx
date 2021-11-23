import type { BBTagProps } from 'components/BBCode/BBTags';
import type { integer } from 'lib/types';
import type { ParseNodeOptions } from 'lib/client/parseBBCode/parseNode';
import BBTags from 'components/BBCode/BBTags';
import preventWhitespaceCollapse from 'lib/client/parseBBCode/preventWhitespaceCollapse';
import parseNode from 'lib/client/parseBBCode/parseNode';

export type ParsedReactNode = string | JSX.Element | ParsedReactNode[];

// We enforce a maximum node depth mainly for the sake of performance.
export const MAX_BB_PARSER_NODE_DEPTH = 384;

// We use char codes instead of 1-character strings in many cases because it's generally faster in the V8 engine (which is what the server runs on).
const LINE_BREAK_CHAR_CODE = 10;
const SPACE_CHAR_CODE = 32;
const HYPHEN_CHAR_CODE = 45;
const FORWARD_SLASH_CHAR_CODE = 47;
const ZERO_CHAR_CODE = 48;
const NINE_CHAR_CODE = 57;
const EQUAL_SIGN_CHAR_CODE = 61;
const RIGHT_SQUARE_BRACKET_CHAR_CODE = 93;
const UNDERSCORE_CHAR_CODE = 95;
const LOWERCASE_A_CHAR_CODE = 97;
const LOWERCASE_Z_CHAR_CODE = 122;

type CommonBBTagData = {
	bbTagDataType: 'opening' | 'closing'
};

type OpeningBBTagData = CommonBBTagData & {
	/** The lowercase name of the BB tag. */
	tagName: string,
	attributes: BBTagProps['attributes'],
	/** The original string representation of the BB tag. */
	string: string,
	/** Whether the opening BB tag has a respective closing tag. */
	closed: boolean
};

type ClosingBBTagData = CommonBBTagData & {
	/** The closing BB tag's respective `OpeningBBTagData`. */
	openingBBTagData: OpeningBBTagData
};

const isOpeningBBTagData = (object: {}): object is OpeningBBTagData => (
	(object as any).bbTagDataType === 'opening'
);

const isClosingBBTagData = (object: {}): object is ClosingBBTagData => (
	(object as any).bbTagDataType === 'closing'
);

export default class BBStringParser<RemoveBBTags extends boolean | undefined = undefined> {
	options: ParseNodeOptions<RemoveBBTags>;
	/**
	 * An array of `string`s, `OpeningBBTagData`, `ClosingBBTagData`, and `Element`s to be parsed, in the same order that they appear in the input.
	 *
	 * The React `key` of any element parsed from this array should be set to its index in this array.
	 */
	nodes: Array<string | OpeningBBTagData | ClosingBBTagData | Element>;
	/**
	 * A mapping from each parsed BB tag's name (lowercase) to an array of integers which index that BB tag's unclosed instances of `OpeningBBTagData` in `nodes`.
	 *
	 * Each array of indexes is sorted from least to greatest.
	 */
	private unclosedBBTagIndexes: Partial<Record<string, integer[]>>;

	constructor(options: ParseNodeOptions<RemoveBBTags>) {
		this.options = options;
		this.nodes = [];
		this.unclosedBBTagIndexes = {};
	}

	/** Generates a `ParsedReactNode` from the parser's nodes. */
	getReactNode(depth: integer = 0): RemoveBBTags extends true ? string : ParsedReactNode {
		const rootChildren: ParsedReactNode[] = [];

		/**
		 * A stack of arrays of parsed children.
		 *
		 * The first item is the children array of the root node, and the last item is the deepest children array currently being processed.
		 */
		const childrenStack: ParsedReactNode[][] = [rootChildren];

		/** Pushes the specified string to the array on the top of the `childrenStack`, or concatenates it onto the array's last item if the last item is already a string. */
		const pushString = (string: string) => {
			const children = childrenStack[childrenStack.length - 1];

			string = preventWhitespaceCollapse(string);

			if (
				// Check if there is a last item.
				children.length
				// Check if the last item is a string.
				&& typeof children[children.length - 1] === 'string'
			) {
				// If the last item is also a string, merge this one into it.
				children[children.length - 1] += string;
			} else {
				children.push(string);
			}
		};

		for (let i = 0; i < this.nodes.length; i++) {
			const node = this.nodes[i];

			if (typeof node === 'string') {
				pushString(node);
			} else if (isOpeningBBTagData(node)) {
				if (node.closed) {
					// This is a valid opening BB tag.

					// Only process this opening tag if the `removeBBTags` option is disabled.
					if (!this.options.removeBBTags) {
						if (depth > MAX_BB_PARSER_NODE_DEPTH) {
							// Since we've reached the max depth, skip past this tag and everything inside it.
							while (true) {
								const skippedNode = this.nodes[++i];
								if (
									isClosingBBTagData(skippedNode)
									&& skippedNode.openingBBTagData === node
								) {
									// Stop skipping when we find the respective closing tag.
									break;
								}
							}
							continue;
						}

						childrenStack.push([]);
						depth++;
					}
				} else {
					// This opening BB tag is invalid, so just treat it as plain text.
					pushString(node.string);
				}
			} else if (isClosingBBTagData(node)) {
				// This is a valid closing BB tag, and `this.options.removeBBTags` is necessarily disabled since `parsePartialBBString` doesn't push `ClosingBBTagData` when that option is enabled.

				const children = childrenStack.pop()!;
				depth--;

				/** We can assert this as non-nullable because the only case in which it's nullable is if the tag name is invalid, which has already been verified not to be the case. */
				const BBTag = BBTags[node.openingBBTagData.tagName]!;
				childrenStack[childrenStack.length - 1].push(
					<BBTag
						key={i}
						attributes={node.openingBBTagData.attributes}
					>
						{(children.length === 0
							? ''
							: children.length === 1
								? children[0]
								: children
						)}
					</BBTag>
				);
			} else {
				// `node` is an `Element`.

				if (depth > MAX_BB_PARSER_NODE_DEPTH) {
					continue;
				}

				childrenStack[childrenStack.length - 1].push(
					parseNode(node, this.options, depth, i)
				);
			}
		}

		return (
			rootChildren.length === 0
				? ''
				: rootChildren.length === 1
					? rootChildren[0]
					: rootChildren
		) as RemoveBBTags extends true ? string : ParsedReactNode;
		// We can assert the above return type because, if `this.options.removeBBTags`, `rootChildren` can't contain any parsed BB tags since any they would be removed. It can only contain a single merged string.
	}

	/** Parses a string as BBCode, partially processing unmatched BB tags, and pushes the result to the parser's nodes. */
	parsePartialBBString(stringWithEscapes: string) {
		let string = '';

		/** A record whose keys are indexes of `string` which should be ignored as special characters. */
		const escapedIndexes: Record<integer, true> = {};

		/** The index of this match of an escape character in `stringWithEscapes`. */
		let escapeIndex;
		/** The index at the end of the previous match, or of the start of the string if there is no previous match. */
		let matchEndIndex = 0;

		while ((
			escapeIndex = stringWithEscapes.indexOf('\\', matchEndIndex)
		) !== -1) {
			// Append the slice of the input string from the end of the previous escape character to the start of this one.
			string += stringWithEscapes.slice(matchEndIndex, escapeIndex);

			// Add this escape character's corresponding index in the `string` to the `escapedIndexes`.
			escapedIndexes[string.length] = true;

			// Move past the escape character.
			matchEndIndex = escapeIndex + 1;

			if (matchEndIndex < stringWithEscapes.length) {
				// Skip a character after this escape character in case this match is an instance of `\\` (two consecutive escape characters), in which case the latter `\` should be escaped by the former one rather than being interpreted as another escape character. Skipping a character skips the latter `\` so it can't matched in the next iteration.
				string += stringWithEscapes[matchEndIndex];
				matchEndIndex++;
			}
		}

		// Append the rest of the input string.
		string += stringWithEscapes.slice(matchEndIndex);

		let openBracketIndex;
		/** The index at the end of the last valid BB tag, or of the start of the string if there is no last valid BB tag. */
		let tagEndIndex = 0;
		matchEndIndex = 0;

		findingTags:
		while ((
			openBracketIndex = string.indexOf('[', matchEndIndex)
		) !== -1) {
			matchEndIndex = openBracketIndex + 1;

			if (openBracketIndex in escapedIndexes) {
				// If the opening bracket is escaped, this tag is invalid.
				continue;
			}

			/** The index of the next closing bracket. Does not necessarily correspond to this tag's opening bracket, for example if it's escaped or inside a quoted attribute. */
			let closeBracketIndex = string.indexOf(']', matchEndIndex);

			if (closeBracketIndex === -1) {
				// If there are no more closing brackets after this opening bracket, then there are no more valid BB tags, so stop searching for them.
				break;
			}

			/** Whether this tag is a closing tag (e.g. `[/tag]`) rather than an opening tag (e.g. `[tag]`). */
			let isClosingTag = false;

			/** The lowercase name of this tag (e.g. `'something'` if the tag is `[SomeThing example=1]`.) */
			let tagName = '';

			/** Equal to `string.charCodeAt(matchEndIndex)` (most of the time). */
			let charCodeAtMatchEndIndex = string.charCodeAt(matchEndIndex);

			if (charCodeAtMatchEndIndex === FORWARD_SLASH_CHAR_CODE) {
				if (matchEndIndex in escapedIndexes) {
					// If the forward slash is escaped, this tag is invalid.
					continue;
				}

				isClosingTag = true;

				// Move past the forward slash.
				matchEndIndex++;

				charCodeAtMatchEndIndex = string.charCodeAt(matchEndIndex);
			}

			// There is no need to be concerned about this loop reaching the end of the string before it breaks, because we've already verified above that there is another `]` character which it can break on before it reaches the end of the string.
			while (true) {
				if (matchEndIndex in escapedIndexes) {
					// If any character in or immediately after the tag name is escaped, this tag is invalid.
					continue findingTags;
				}

				// Turn on the bit in the char code that converts letters to lowercase.
				const lowercaseCharCode = charCodeAtMatchEndIndex | 0b100000;

				if (
					lowercaseCharCode < LOWERCASE_A_CHAR_CODE
					|| lowercaseCharCode > LOWERCASE_Z_CHAR_CODE
				) {
					// This isn't a letter, so end the tag name.
					break;
				}

				// Add this letter (converted to lowercase) to the tag name.
				tagName += String.fromCharCode(lowercaseCharCode);

				// Prepare to check the next character.
				matchEndIndex++;
				charCodeAtMatchEndIndex = string.charCodeAt(matchEndIndex);
			}

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

				const openingBBTagDataIndex = this.unclosedBBTagIndexes[tagName]?.pop();

				if (openingBBTagDataIndex === undefined) {
					// This closing tag has no respective opening tag.
					continue;
				}

				// This closing tag is valid.

				charCodeAtMatchEndIndex = string.charCodeAt(matchEndIndex);
				if (
					BBTags[tagName]!.withBlock
					&& charCodeAtMatchEndIndex === LINE_BREAK_CHAR_CODE
				) {
					// If this tag is a block element followed by a line break, skip the line break since there is already a break after block elements naturally. This allows for more intuitive line breaking behavior for the user.
					matchEndIndex++;
				}

				/** This closing tag's respective `OpeningBBTagData`. */
				const openingBBTagData = this.nodes[openingBBTagDataIndex] as OpeningBBTagData;

				// Push the slice of the string from the end of the last tag to the start of this one.
				this.nodes.push(
					string.slice(tagEndIndex, openBracketIndex)
				);

				tagEndIndex = matchEndIndex;

				// Push this closing tag's data, but only if the `removeBBTags` option is disabled.
				if (!this.options.removeBBTags) {
					const closingBBTagData: ClosingBBTagData = {
						bbTagDataType: 'closing',
						openingBBTagData
					};

					this.nodes.push(closingBBTagData);
				}

				// When a tag is closed, discard all the unclosed opening tags inside it.
				const unclosedBBTagNames = Object.keys(this.unclosedBBTagIndexes);
				for (let i = 0; i < unclosedBBTagNames.length; i++) {
					const unclosedBBTagName = unclosedBBTagNames[i];

					if (unclosedBBTagName === tagName) {
						// Don't check for unclosed tags with the same name as this closing tag inside it, since the opening tag to be closed by any closing tag is always the last one, so there can't be any more after it.
						continue;
					}

					const unclosedBBTagIndexes = this.unclosedBBTagIndexes[unclosedBBTagName]!;

					while (
						// Check if this tag name has a last unclosed opening tag.
						unclosedBBTagIndexes.length
						// Check if this tag name's last unclosed opening tag is inside the tag being closed.
						&& unclosedBBTagIndexes[unclosedBBTagIndexes.length - 1] > openingBBTagDataIndex
					) {
						// Discard it.
						unclosedBBTagIndexes.pop();
					}
				}

				// Set the respective opening tag as closed.
				openingBBTagData.closed = true;
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
					if (
						(charAfterEqualSign === '"' || charAfterEqualSign === '\'')
						// Ensure the opening delimiter is not escaped.
						&& !(matchEndIndex in escapedIndexes)
					) {
						// Move past the opening delimiter.
						matchEndIndex++;

						let attributeValueEndIndex = string.indexOf(charAfterEqualSign, matchEndIndex);

						while (attributeValueEndIndex in escapedIndexes) {
							// Find a closing delimiter which isn't escaped.
							attributeValueEndIndex = string.indexOf(charAfterEqualSign, attributeValueEndIndex + 1);
						}

						if (attributeValueEndIndex === -1) {
							// This tag's attribute has an opening delimiter but no closing delimiter, so this tag is invalid.
							continue;
						}

						// Expect there to be a closing bracket immediately after the attribute ends.
						closeBracketIndex = attributeValueEndIndex + 1;

						if (
							closeBracketIndex in escapedIndexes
							|| string.charCodeAt(closeBracketIndex) !== RIGHT_SQUARE_BRACKET_CHAR_CODE
						) {
							// This tag's attribute doesn't have a non-escaped closing bracket immediately after it, so this tag is invalid.
							continue;
						}

						attributes = string.slice(matchEndIndex, attributeValueEndIndex);
					} else {
						while (closeBracketIndex in escapedIndexes) {
							// Find a closing bracket which isn't escaped.
							closeBracketIndex = string.indexOf(']', closeBracketIndex + 1);
						}

						if (closeBracketIndex === -1) {
							// If there are no more non-escaped closing brackets, then there are no more valid BB tags, so stop searching for them.
							break;
						}

						attributes = string.slice(matchEndIndex, closeBracketIndex);
					}

					// Move past the attribute and the closing bracket immediately after it.
					matchEndIndex = closeBracketIndex + 1;
				} else if (charCodeAtMatchEndIndex === SPACE_CHAR_CODE) {
					// Parse this tag's attributes.

					attributes = {};

					while (true) {
						// Move past the space before the attribute.
						matchEndIndex++;

						let attributeName = '';

						// Parse the attribute's name.
						while (true) {
							if (matchEndIndex in escapedIndexes) {
								// If any character in or immediately after the attribute's name is escaped, this tag is invalid.
								continue findingTags;
							}

							charCodeAtMatchEndIndex = string.charCodeAt(matchEndIndex);

							if (
								charCodeAtMatchEndIndex === HYPHEN_CHAR_CODE
								|| charCodeAtMatchEndIndex === UNDERSCORE_CHAR_CODE
								|| (charCodeAtMatchEndIndex >= ZERO_CHAR_CODE && charCodeAtMatchEndIndex <= NINE_CHAR_CODE)
							) {
								// Add this hyphen, underscore, or digit to the attribute name.
								attributeName += String.fromCharCode(charCodeAtMatchEndIndex);
							} else {
								// Turn on the bit in the char code that converts letters to lowercase.
								const lowercaseCharCode = charCodeAtMatchEndIndex | 0b100000;

								if (
									lowercaseCharCode < LOWERCASE_A_CHAR_CODE
									|| lowercaseCharCode > LOWERCASE_Z_CHAR_CODE
								) {
									// This isn't a hyphen, underscore, digit, or letter, so end the attribute name.
									break;
								}

								// Add this letter (converted to lowercase) to the attribute name.
								attributeName += String.fromCharCode(lowercaseCharCode);
							}

							// Prepare to check the next character.
							matchEndIndex++;
						}

						if (charCodeAtMatchEndIndex !== EQUAL_SIGN_CHAR_CODE) {
							// If any attribute is missing an equal sign immediately after its name, this tag is invalid.
							continue findingTags;
						}

						// Move past the equal sign.
						matchEndIndex++;

						if (attributeName.length === 0) {
							// If any attribute is missing a name before the equal sign, this tag is invalid.
							continue findingTags;
						}

						// Parse the attribute's value.

						let spaceIndex;

						const charAfterEqualSign = string[matchEndIndex];
						if (
							(charAfterEqualSign === '"' || charAfterEqualSign === '\'')
							// Ensure the opening delimiter is not escaped.
							&& !(matchEndIndex in escapedIndexes)
						) {
							// Move past the opening delimiter.
							matchEndIndex++;

							let attributeValueEndIndex = string.indexOf(charAfterEqualSign, matchEndIndex);

							while (attributeValueEndIndex in escapedIndexes) {
								// Find a closing delimiter which isn't escaped.
								attributeValueEndIndex = string.indexOf(charAfterEqualSign, attributeValueEndIndex + 1);
							}

							if (attributeValueEndIndex === -1) {
								// If any attribute has an opening delimiter but no closing delimiter, this tag is invalid.
								continue findingTags;
							}

							attributes[attributeName] = string.slice(matchEndIndex, attributeValueEndIndex);

							// Move past the attribute value and the closing delimiter immediately after it.
							matchEndIndex = attributeValueEndIndex + 1;

							if (matchEndIndex in escapedIndexes) {
								// If the character immediately after any attribute's closing delimiter is escaped, this tag is invalid.
								continue findingTags;
							}

							charCodeAtMatchEndIndex = string.charCodeAt(matchEndIndex);

							if (!(
								charCodeAtMatchEndIndex === RIGHT_SQUARE_BRACKET_CHAR_CODE
								|| charCodeAtMatchEndIndex === SPACE_CHAR_CODE
							)) {
								// If the character immediately after this attribute is not a closing bracket or space, this tag is invalid.
								continue findingTags;
							}
						} else {
							// This attribute is unquoted, so try to end its value at the next closing bracket or space.

							// If the `closeBracketIndex` found previously is before the start of this attribute, find a new one after the start of this attribute.
							if (closeBracketIndex < matchEndIndex) {
								closeBracketIndex = string.indexOf(']', matchEndIndex);

								if (closeBracketIndex === -1) {
									// If there are no more closing brackets, then there are no more valid BB tags, so stop searching for them.
									break findingTags;
								}
							}

							// If there is no `spaceIndex` found previously or the `spaceIndex` found previously is before the start of this attribute, find a new one after the start of this attribute.
							if (spaceIndex === undefined || spaceIndex < matchEndIndex) {
								spaceIndex = string.indexOf(' ', matchEndIndex);
							}

							let attributeValueEndIndex;

							// Find the next non-escaped closing bracket or space.
							while (true) {
								// Check if there is no space or the closing bracket is before the space.
								if (spaceIndex === -1 || closeBracketIndex < spaceIndex) {
									if (closeBracketIndex in escapedIndexes) {
										// Find a closing bracket which isn't escaped.
										closeBracketIndex = string.indexOf(']', closeBracketIndex + 1);

										if (closeBracketIndex === -1) {
											// If there are no more closing brackets, then there are no more valid BB tags, so stop searching for them.
											break findingTags;
										}
									} else {
										// A non-escaped closing bracket has been found first, so end the attribute's value at the closing bracket.
										attributeValueEndIndex = closeBracketIndex;
										// This is set for after the `matchEndIndex` will be moved past the attribute value.
										charCodeAtMatchEndIndex = RIGHT_SQUARE_BRACKET_CHAR_CODE;
										break;
									}
								} else if (spaceIndex in escapedIndexes) {
									// Find a space which isn't escaped.
									spaceIndex = string.indexOf(' ', spaceIndex + 1);
								} else {
									// A non-escaped space has been found first, so end the attribute's value at the space.
									attributeValueEndIndex = spaceIndex;
									// This is set for after the `matchEndIndex` will be moved past the attribute value.
									charCodeAtMatchEndIndex = SPACE_CHAR_CODE;
									break;
								}
							}

							attributes[attributeName] = string.slice(matchEndIndex, attributeValueEndIndex);

							// Move past the attribute value.
							matchEndIndex = attributeValueEndIndex;
						}

						// `charCodeAtMatchEndIndex` (the character immediately after the attribute) equals either `SPACE_CHAR_CODE` or `RIGHT_SQUARE_BRACKET_CHAR_CODE`.

						if (charCodeAtMatchEndIndex === RIGHT_SQUARE_BRACKET_CHAR_CODE) {
							// Move past the closing bracket.
							matchEndIndex++;

							// Finish parsing attributes.
							break;
						}

						// `charCodeAtMatchEndIndex === SPACE_CHAR_CODE`, so keep parsing attributes.
					}
				} else {
					// The character immediately after the tag name is invalid.
					continue;
				}

				// This opening tag is valid.

				// Push the slice of the string from the end of the last tag to the start of this one.
				this.nodes.push(
					string.slice(tagEndIndex, openBracketIndex)
				);

				tagEndIndex = matchEndIndex;

				const openingBBTagData: OpeningBBTagData = {
					bbTagDataType: 'opening',
					tagName,
					attributes,
					string: string.slice(openBracketIndex, tagEndIndex),
					closed: false
				};

				// Push this opening tag's data.
				this.nodes.push(openingBBTagData);

				// Create the `unclosedBBTagIndexes` array for this tag name if it doesn't already exist.
				if (!(tagName in this.unclosedBBTagIndexes)) {
					this.unclosedBBTagIndexes[tagName] = [];
				}

				// Push this opening tag's index in `nodes` to the `unclosedBBTagIndexes` array for this tag name.
				this.unclosedBBTagIndexes[tagName]!.push(this.nodes.length - 1);
			}
		}

		// Push the rest of the string.
		this.nodes.push(
			string.slice(tagEndIndex)
		);
	}
}