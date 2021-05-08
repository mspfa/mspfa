import type { BBTag, BBTagProps } from 'components/BBCode/BBTags';
import type { ReactNode } from 'react';

const trimLineBreaks = (node: ReactNode) => {
	if (Array.isArray(node)) {
		if (typeof node[0] === 'string') {
			node[0] = node[0].replace(/^\n+/, '');
		}

		const lastNode = node[node.length - 1];
		if (typeof lastNode === 'string') {
			node[node.length - 1] = lastNode.replace(/\n+$/, '');
		}
	} else if (typeof node === 'string') {
		node = node.replace(/^\n+|\n+$/g, '');
	}

	return node;
};

/**
 * Any `BBTag` which returns a block element (e.g. `div`) should be wrapped with this.
 *
 * Trims line breaks from the immediate start and end of the tag's children.
 *
 * If there is a line break immediately following the tag, removes it.
 */
const withBlock = (BBTag: BBTag) => {
	const BBTagWithBlock = ({ children, ...props }: BBTagProps) => (
		<BBTag {...props}>
			{trimLineBreaks(children)}
		</BBTag>
	);

	BBTagWithBlock.withBlock = true as const;

	return BBTagWithBlock;
};

export default withBlock;