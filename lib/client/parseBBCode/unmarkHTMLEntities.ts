/** Removes all escape characters which were inserted by `markHTMLEntities`. */
const unmarkHTMLEntities = (string: string) => {
	let newString = '';

	let escapeIndex;
	/** The index at the end of the previous match, or of the start of the string if there is no previous match. */
	let matchEndIndex = 0;

	while ((
		escapeIndex = string.indexOf('\\', matchEndIndex)
	) !== -1) {
		// Append the slice of the input string from the end of the previous escape character to the start of this one.
		newString += string.slice(matchEndIndex, escapeIndex);

		// Move past the escape character.
		matchEndIndex = escapeIndex + 1;

		if (matchEndIndex < string.length) {
			// Skip a character after this escape character in case this match is an instance of `\\` (two consecutive escape characters), in which case the latter `\` should be escaped by the former one rather than being interpreted as another escape character. Skipping a character skips the latter `\` so it can't matched in the next iteration.
			newString += string[matchEndIndex];
			matchEndIndex++;
		}
	}

	// Append the rest of the input string.
	newString += string.slice(matchEndIndex);

	return newString;
};

export default unmarkHTMLEntities;