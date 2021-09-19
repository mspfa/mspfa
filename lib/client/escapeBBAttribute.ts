import escapeHTMLTags from 'lib/client/escapeHTMLTags';
import replaceAll from 'lib/client/replaceAll';

/** Escapes a user-inputted attribute value for use in BBCode. */
const escapeBBAttribute = (
	/** The value of the attribute. */
	value: string,
	/** Whether it's possible that the tag could be interpreted as having multiple attributes, and thus equal signs and extra quotation marks and apostrophes need to be escaped. */
	possiblyMultipleAttributes?: boolean
) => {
	// Escape angle brackets, since HTML is parsed before BBCode and could otherwise be parsed in the middle of a BB tag's attribute.
	value = escapeHTMLTags(value);

	if (
		value.includes(']')
		|| (possiblyMultipleAttributes && value.includes('='))
	) {
		if (value.includes('"') && !value.includes('\'')) {
			return `'${value}'`;
		}

		return `"${replaceAll(value, '"', '&quot;')}"`;
	}

	if (value[0] === '"' && (
		// If there are possibly multiple attributes, the first character being `"` or `'` still needs to be escaped even if the last character isn't `"` or `'`, because otherwise, for example, `[spoiler show="' hide='"]` would be misinterpreted by the BBCode parser as having one attribute rather than two.
		possiblyMultipleAttributes
		|| value[value.length - 1] === '"'
	)) {
		if (value.includes('\'')) {
			return `&quot;${value.slice(1)}`;
		}

		return `'${value}'`;
	}

	if (value[0] === '\'' && (
		possiblyMultipleAttributes
		|| value[value.length - 1] === '\''
	)) {
		if (value.includes('"')) {
			return `&#39;${value.slice(1)}`;
		}

		return `"${value}"`;
	}

	return value;
};

export default escapeBBAttribute;