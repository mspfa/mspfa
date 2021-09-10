import type { BBTag, BBTagProps } from 'components/BBCode/BBTags';
import type { ReactNode } from 'react';

const trimStartLineBreaks = (string: string) => {
	while (string[0] === '\n') {
		string = string.slice(1);
	}

	return string;
};

const trimEndLineBreaks = (string: string) => {
	for (
		let endIndex = string.length - 1;
		string[endIndex] === '\n';
		endIndex--
	) {
		string = string.slice(0, -1);
	}

	return string;
};

const trimLineBreaks = (node: ReactNode) => {
	if (Array.isArray(node)) {
		if (typeof node[0] === 'string') {
			node[0] = trimStartLineBreaks(node[0]);
		}

		const lastNode = node[node.length - 1];
		if (typeof lastNode === 'string') {
			node[node.length - 1] = trimEndLineBreaks(lastNode);
		}
	} else if (typeof node === 'string') {
		node = trimEndLineBreaks(trimStartLineBreaks(node));
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