import './styles.module.scss';
import React from 'react';
import type { ParseBBCodeOptions } from 'lib/client/parseBBCode';
import parseBBCode from 'lib/client/parseBBCode';

export type BBCodeProps = ParseBBCodeOptions & {
	/** The original input BBCode string. */
	children?: string
};

/** A component which parses its children string as BBCode. */
const BBCode = React.memo(({
	children: htmlString = '',
	...parseOptions
}: BBCodeProps) => (
	<span className="bb">
		{parseBBCode(htmlString, parseOptions)}
	</span>
));

export default BBCode;