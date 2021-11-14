import { reactPropNames, booleanProps } from 'lib/client/parseBBCode/reactPropInfo';
import unmarkHTMLEntities from 'lib/client/parseBBCode/unmarkHTMLEntities';

/** Takes an `Element` and returns an object of the React props determined from its attributes. */
const attributesToProps = (element: Element) => {
	const props: Record<string, string | boolean | Record<string, string>> = {};

	for (let i = 0; i < element.attributes.length; i++) {
		const attribute = element.attributes[i];
		const propName = reactPropNames[attribute.name] || attribute.name;

		// Be sure to handle any reserved props which would pass through the sanitizer: https://github.com/facebook/react/blob/5890e0e692d1c39eddde0110bd0d123409f31dd3/packages/react-dom/src/shared/DOMProperty.js#L236
		// Currently, the only reserved props that pass through the sanitizer are `defaultChecked`, `defaultValue`, and `style`.

		if (booleanProps[propName]) {
			props[propName] = true;
		} else if (propName === 'style') {
			element.setAttribute('style', unmarkHTMLEntities(attribute.value));

			props.style = {};

			const elementStyle = (element as Element & { style: CSSStyleDeclaration }).style;

			for (let j = 0; j < elementStyle.length; j++) {
				const styleName = elementStyle[j];

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

					// `-ms-` must remain lowercase (e.g. `-ms-transform` -> `msTransform`), despite that `-webkit-`, `-moz-`, and `-o-` become capitalized (e.g. `-webkit-transform` -> `WebkitTransform`).
					if (styleName.startsWith('-ms-')) {
						stylePropName += 'ms';
						matchEndIndex = '-ms'.length;
					}

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

				props.style[stylePropName] = elementStyle.getPropertyValue(styleName);
			}

			// This is necessary because different environments may have different ways of deserializing the `style` attribute to a `CSSStyleDeclaration`.
			// For example, JSDOM deserializes `margin: 2px` into `{ margin: '2px' }`, while Chrome 92 deserializes it into `{ 'margin-top': '2px', 'margin-right': '2px', 'margin-bottom': '2px', 'margin-left': '2px' }`.
			// We could parse `attribute.value` here with our own consistent implementation instead of depending on the environment's inconsistent implementation of `CSSStyleDeclaration`, but that would be much more complicated (due to escaped special characters and special characters in CSS strings) and less performant, while providing no functional difference.
			props.suppressHydrationWarning = true;
		} else {
			props[propName] = unmarkHTMLEntities(attribute.value);
		}
	}

	return props;
};

export default attributesToProps;