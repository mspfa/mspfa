// Regular expressions from https://github.com/cure53/DOMPurify/blob/e1c19cf6407d782b666cb1d02a6af191f9cbc09e/src/regexp.js.
const attributeWhitespaceTest = /[\u0000-\u0020\u00A0\u1680\u180E\u2000-\u2029\u205F\u3000]/g;
const unsafeURLTest = /^(?:\w+script|data):/i;

/** Returns the input URL if it is safe. Returns `undefined` if not. */
const sanitizeURL = (url: string) => {
	url = url.replace(attributeWhitespaceTest, '');

	return unsafeURLTest.test(url) ? undefined : url;
};

export default sanitizeURL;