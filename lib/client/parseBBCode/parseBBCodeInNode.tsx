import BBTags from 'components/BBCode/BBTags';
import type { integer } from 'lib/types';
import type { Key, ReactNode, ReactNodeArray } from 'react';
import attributesToProps from 'lib/client/parseBBCode/attributesToProps';

/** Returns whether `node instanceof Element`. */
const isElementNode = (node: Node): node is Element => (
	node.nodeType === 1
);

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
const isTextNode = (node: Node): node is Text & { nodeValue: string } => (
	node.nodeType === 3
);

/** Returns whether `node instanceof DocumentFragment`. */
const isDocumentFragmentNode = (node: Node): node is DocumentFragment => (
	node.nodeType === 11
);

/** A key of an opening tag match array that maps to the index of the opening tag in the output `htmlString`. */
const _htmlIndex = Symbol('htmlIndex');

type BBTagMatch = RegExpExecArray & {
	[_htmlIndex]: integer
};

export type ParseBBCodeInNodeOptions<RemoveBBTags extends boolean | undefined = boolean | undefined> = {
	/** Whether to strip all BB tags from the input and keep only their children. */
	removeBBTags?: RemoveBBTags
};

/**
 * Parses BBCode in the inputted string or child text nodes.
 *
 * ⚠️ Assumes the input is already sanitized.
 */
const parseBBCodeInNode = <
	KeepHTMLTags extends boolean | undefined = undefined,
	RemoveBBTags extends boolean | undefined = undefined
>(
	node: string | DocumentFragment | Element | Text,
	options: ParseBBCodeInNodeOptions<RemoveBBTags>,
	key: Key = 0
): (
	KeepHTMLTags extends true
		? ReactNode
		: RemoveBBTags extends true
			? string
			: ReactNode
) => {
	if (typeof node === 'string') {
		return node;
	}

	if (isTextNode(node)) {
		return node.nodeValue;
	}

	const childrenArray: ReactNodeArray = [];

	for (let i = 0; i < node.childNodes.length; i++) {
		// We can assert this because any `ChildNode` is necessarily an `Element | Text | Comment`, and `Comment`s are sanitized out.
		const childNode = node.childNodes[i] as Element | Text;

		if (isTextNode(childNode)) {
			const childNodeValue = childNode.nodeValue;

			// We're able to push the string without wrapping it in a fragment with a key because strings don't need React keys.
			childrenArray.push(childNodeValue);
		} else {
			// If this point is reached, `childNode instanceof Element`.
			childrenArray.push(
				parseBBCodeInNode(childNode, options, i)
			);
		}
	}

	const children = (
		childrenArray.length === 0
			? null
			: childrenArray.length === 1
				? childrenArray[0]
				: childrenArray
	);

	if (isDocumentFragmentNode(node)) {
		return children as any;
	}

	const TagName: any = (
		isHTMLElement(node)
			// `HTMLElement`s have uppercase tag names, and React requires them to be lowercase.
			? node.nodeName.toLowerCase()
			// Other `Element`s (such as `SVGElement`s) may have case-sensitive tag names, so their case must not be modified.
			: node.nodeName
	);

	return (
		<TagName
			key={key}
			{...attributesToProps(node)}
		>
			{children}
		</TagName>
	) as any;
};

export default parseBBCodeInNode;