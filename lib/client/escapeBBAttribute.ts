import escapeAngleBrackets from 'lib/client/escapeAngleBrackets';
import replaceAll from 'lib/client/replaceAll';

/** Escapes and quotes a user-inputted attribute value for use in BBCode. */
const escapeBBAttribute = (
	/** The raw, unquoted value of the attribute. */
	value: string,
	/** Whether it's possible that the tag could be interpreted as having multiple attributes, and thus equal signs need to be escaped. */
	possiblyMultipleAttributes?: boolean
) => {
	// Escape angle brackets, since HTML is parsed before BBCode and could otherwise be parsed in the middle of a BB tag's attribute, even if it's quoted.
	value = escapeAngleBrackets(value);

	if (
		value.includes(']')
		|| (possiblyMultipleAttributes && value.includes(' '))
	) {
		if (value.includes('"') && !value.includes('\'')) {
			return `'${value}'`;
		}

		return `"${replaceAll(value, '"', '&quot;')}"`;
	}

	if (value[0] === '"') {
		if (value.includes('\'')) {
			return `&quot;${value.slice(1)}`;
		}

		return `'${value}'`;
	}

	if (value[0] === '\'') {
		if (value.includes('"')) {
			return `&#39;${value.slice(1)}`;
		}

		return `"${value}"`;
	}

	return value;
};

export default escapeBBAttribute;