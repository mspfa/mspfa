import BBTags from 'components/BBCode/BBTags';
import type { integer } from 'lib/types';
import type { Key, ReactNode, ReactNodeArray } from 'react';
import attributesToProps from 'lib/client/parseBBCode/attributesToProps';

/** Returns whether `node instanceof Element`. */
const isElementNode = (node: Node): node is Element => (
	node.nodeType === 1
);

/** Returns whether `element instanceof SVGElement`. */
const isSVGElement = (element: Element): element is SVGElement => (
	'ownerSVGElement' in element
);

/** Returns whether `node instanceof Text`. */
const isTextNode = (node: Node): node is Text => (
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

export type ParseBBCodeInNodeOptions = {
	/** Whether to strip all BB tags from the input and keep only their children. */
	removeBBTags?: boolean
};

/**
 * Parses BBCode in the inputted string or child text nodes.
 *
 * ⚠️ Assumes the input is already sanitized.
 */
const parseBBCodeInNode = (
	node: string | DocumentFragment | Element | Text,
	options: ParseBBCodeInNodeOptions,
	key: Key = 0
): ReactNode => {
	if (typeof node === 'string') {
		// TODO
		return;
	}

	// TODO: Remove this.
	if (isTextNode(node)) {
		return;
	}

	const children: ReactNodeArray = [];

	for (let i = 0; i < node.childNodes.length; i++) {
		// We can assert this because any `ChildNode` is necessarily an `Element | Text | Comment`, and `Comment`s are sanitized out.
		const childNode = node.childNodes[i] as Element | Text;

		if (isTextNode(childNode)) {
			const childNodeValue = childNode.nodeValue!;

			children.push(childNodeValue);
		} else {
			// If this point is reached, `childNode instanceof Element`.
			children.push(
				parseBBCodeInNode(childNode, options, i)
			);
		}
	}

	if (isDocumentFragmentNode(node)) {
		return children;
	}

	const TagName: any = (
		isSVGElement(node)
			? node.nodeName
			: node.nodeName.toLowerCase()
	);

	return (
		<TagName
			key={key}
			{...attributesToProps(node)}
		>
			{children}
		</TagName>
	);
};

export default parseBBCodeInNode;