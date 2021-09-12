import { possibleStandardNames, booleanProps } from 'lib/client/parseBBCode/reactPropInfo';

const attributesToProps = (element: Element) => {
	const props: Record<string, string | boolean | Record<string, string>> = {};

	for (let i = 0; i < element.attributes.length; i++) {
		const attribute = element.attributes[i];
		const propName = possibleStandardNames[attribute.name] || attribute.name;

		// Be sure to handle any reserved props which would pass through the sanitizer: https://github.com/facebook/react/blob/5890e0e692d1c39eddde0110bd0d123409f31dd3/packages/react-dom/src/shared/DOMProperty.js#L236
		// Currently, the only reserved prop that passes through the sanitizer is `style`.

		if (booleanProps[propName]) {
			props[propName] = true;
		} else if (propName === 'style') {
			props.style = {};

			const { style } = (element as Element & { style: CSSStyleDeclaration });

			for (let j = 0; j < style.length; j++) {
				const styleName = style[j];

				let stylePropName = (
					// Names of CSS variable properties should not be converted to camel case.
					styleName.startsWith('--')
						? styleName
						: ''
				);

				// If the style prop name has not already been determined, determine it by converting the style name to camel case.
				if (!stylePropName) {
					let matchIndex;
					/** The index at the end of the previously matched hyphen (or character after it), or of the start of the string if there is no previous match. */
					let matchEndIndex = 0;
					while ((
						matchIndex = styleName.indexOf('-', matchEndIndex)
					) !== -1) {
						// Append the slice of the `styleName` from the end of the previous hyphen to the start of this hyphen.
						stylePropName += styleName.slice(matchEndIndex, matchIndex);

						// Omit the hyphen.
						matchEndIndex = matchIndex + 1;

						if (matchEndIndex < styleName.length) {
							stylePropName += styleName[matchEndIndex].toUpperCase();
							matchEndIndex++;
						}
					}

					// Append the rest of `styleName`.
					stylePropName += styleName.slice(matchEndIndex);
				}

				props.style[stylePropName] = style.getPropertyValue(styleName);
			}
		} else {
			props[propName] = attribute.value;
		}
	}

	return props;
};

export default attributesToProps;