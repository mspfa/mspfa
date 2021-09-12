import './styles.module.scss';
import type { ReactNode } from 'react';
import React, { useMemo } from 'react';
import type { ParseBBCodeOptions } from 'lib/client/parseBBCode';
import parseBBCode from 'lib/client/parseBBCode';

export type BBCodeProps<AlreadyParsed extends boolean | undefined = boolean | undefined> = (
	ParseBBCodeOptions & {
		/** Whether the input has already been parsed and no sanitization or parsing should be performed by this component. */
		alreadyParsed?: AlreadyParsed,
		/** The input BBCode/HTML string. */
		children?: (
			false extends AlreadyParsed
				? string
				: undefined extends AlreadyParsed
					? string
					: ReactNode
		)
	}
);

/** A component which parses its children string as BBCode. */
const BBCode = <AlreadyParsed extends boolean | undefined = false>({
	children = '',
	alreadyParsed,
	keepHTMLTags,
	escapeHTML,
	removeBBTags
}: BBCodeProps<AlreadyParsed>) => useMemo(() => (
	<span className="bb">
		{(alreadyParsed
			? children as ReactNode
			: parseBBCode(children as string, { keepHTMLTags, escapeHTML, removeBBTags })
		)}
	</span>
), [children, alreadyParsed, keepHTMLTags, escapeHTML, removeBBTags]);

export default BBCode;