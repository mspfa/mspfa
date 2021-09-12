import replaceAll from 'lib/client/replaceAll';

/**
 * Replaces some spaces in the input string with non-breaking spaces to prevent collapsing whitespace in parsed BBCode.
 *
 * This does not prevent collapsing whitespace at the end of a wrapped line. That should still be collapsed.
 */
const preventWhitespaceCollapse = (string: string) => {
	if (string[0] === ' ') {
		string = `&nbsp;${string.slice(1)}`;
	}
	if (string[string.length - 1] === ' ') {
		string = `${string.slice(0, -1)}&nbsp;`;
	}
	string = replaceAll(string, '  ', ' &nbsp;');
};

export default preventWhitespaceCollapse;