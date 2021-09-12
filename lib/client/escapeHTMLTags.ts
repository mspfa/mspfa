import replaceAll from 'lib/client/replaceAll';

/** Replaces all `<` with `&lt;` and `>` with `&gt;`. Does not escape HTML entities or attributes. */
const escapeHTMLTags = (string: string) => (
	replaceAll(replaceAll(string, '<', '&lt;'), '>', '&gt;')
);

export default escapeHTMLTags;