import type { Key, ReactNode } from 'react';
import attributesToProps from 'lib/client/parseBBCode/attributesToProps';
import BBStringParser from 'lib/client/parseBBCode/BBStringParser';
import unmarkHTMLEntities from 'lib/client/parseBBCode/unmarkHTMLEntities';

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

/** Returns whether `node instanceof HTMLStyleElement`. */
const isHTMLStyleElement = (node: Node): node is HTMLStyleElement => (
	node.nodeName === 'STYLE'
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
	RemoveBBTags extends boolean | undefined = undefined,
	NodeType extends string | DocumentFragment | Element = string | DocumentFragment | Element
>(
	node: NodeType,
	options: ParseNodeOptions<RemoveBBTags>,
	key: Key = 0
): (
	NodeType extends Element
		? JSX.Element
		: RemoveBBTags extends true
			? string
			: ReactNode
) => {
	if (typeof node === 'string') {
		const parser = new BBStringParser(options);

		parser.parsePartialBBString(node);

		return parser.getReactNode() as any;
	}

	/** Returns `node.childNodes` parsed into a `ReactNode` with parsed BBCode. */
	const parseNodeChildren = () => {
		const parser = new BBStringParser(options);

		for (let i = 0; i < node.childNodes.length; i++) {
			// We can assert this because any `ChildNode` is necessarily an `Element | Text | Comment`, and `Comment`s are sanitized out.
			const childNode = node.childNodes[i] as Element | Text;

			if (isTextNode(childNode)) {
				parser.parsePartialBBString(childNode.nodeValue!);
			} else {
				// If this point is reached, `childNode instanceof Element`.

				parser.parsedItems.push(
					parseNode(childNode, options, parser.parsedItems.length)
				);
			}
		}

		return parser.getReactNode();
	};

	if (isDocumentFragmentNode(node)) {
		return parseNodeChildren() as any;
	}

	const TagName = (
		isHTMLElement(node)
			// `HTMLElement`s have uppercase tag names, and React requires them to be lowercase.
			? node.nodeName.toLowerCase()
			// Other `Element`s (such as `SVGElement`s) may have case-sensitive tag names, so their case must not be modified.
			: node.nodeName
	);

	const props: ReturnType<typeof attributesToProps> & {
		children?: ReactNode
	} = attributesToProps(node);

	if (isHTMLStyleElement(node)) {
		// If this is a `style` element, set its `children` to the plain string of its contents instead of parsing it as BBCode.
		props.children = unmarkHTMLEntities(node.innerHTML);
	} else if (isHTMLTextAreaElement(node)) {
		// If this is a `textarea`, set its `defaultValue` instead of parsing its `children` as BBCode.
		props.defaultValue = unmarkHTMLEntities(node.value);
	} else {
		// Otherwise, parse its `children` as BBCode.
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