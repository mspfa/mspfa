import replaceAll from 'lib/client/replaceAll';

/**
 * Replaces some spaces in the input string with non-breaking spaces to prevent collapsing whitespace in parsed BBCode.
 *
 * This does not prevent collapsing whitespace at the end of a wrapped line. That should still be collapsed.
 */
const preventWhitespaceCollapse = (string: string) => {
	// `\u00a0` is the non-breaking space character.

	if (string[0] === ' ') {
		string = '\u00a0' + string.slice(1);
	}

	if (string[string.length - 1] === ' ') {
		string = string.slice(0, -1) + '\u00a0';
	}

	string = replaceAll(string, ' \n', '\u00a0\n');
	string = replaceAll(string, '\n ', '\n\u00a0');

	string = replaceAll(string, '  ', ' \u00a0');

	return string;
};

export default preventWhitespaceCollapse;