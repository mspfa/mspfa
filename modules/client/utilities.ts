/**
 * Converts any string to kebab case.
 *
 * Example:
 * ```
 * toKebabCase('THEQuick... brown.foxJumps!') === 't-h-e-quick-brown-fox-jumps'
 * ```
 */
export const toKebabCase = (string: string) => (
	string
		.replace(/([A-Z])/g, '-$1')
		.replace(/\W/g, '-')
		.replace(/-+/g, '-')
		.replace(/^-|-$/g, '')
		.toLowerCase()
);

/** Returns a boolean for whether a keyboard control should be ignored. */
export const shouldIgnoreControl = () => (
	// Check if the element currenly in focus has a `select` method i.e. if it is a text input.
	(document.activeElement as any)?.select instanceof Function
);

// Regular expressions from https://github.com/cure53/DOMPurify/blob/e1c19cf6407d782b666cb1d02a6af191f9cbc09e/src/regexp.js.
const attributeWhitespaceTest = /[\u0000-\u0020\u00A0\u1680\u180E\u2000-\u2029\u205F\u3000]/g;
const unsafeURLTest = /^(?:\w+script|data):/i;

/** Returns the input URL if it is safe. Returns `undefined` if not. */
export const sanitizeURL = (url: string) => {
	url = url.replace(attributeWhitespaceTest, '');

	return unsafeURLTest.test(url) ? undefined : url;
};

/** A customizer for Lodash's `mergeWith` which merges normally except overwrites arrays. */
export const overwriteArrays = (objectValue: any, sourceValue: any) => {
	if (Array.isArray(objectValue)) {
		return sourceValue;
	}
};