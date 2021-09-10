/** Replaces all instances of a substring (case-sensitive) with another string very efficiently (i.e. without regular expressions). */
const replaceAll = (string: string, searchValue: string, replaceValue: string) => {
	let newString = '';

	// Handle `searchValue === ''` differently, since otherwise it would cause an infinite loop.
	if (searchValue.length === 0) {
		newString = replaceValue;

		for (let i = 0; i < string.length; i++) {
			newString += string[i] + replaceValue;
		}

		return newString;
	}

	let matchIndex;
	/** The index at the end of the previous match, or of the start of the string if there is no previous match. */
	let matchEndIndex = 0;

	while ((
		matchIndex = string.indexOf(searchValue, matchEndIndex)
	) !== -1) {
		// Append the slice of the input string from the end of the previous match to the start of this match, followed by the `replaceValue`.
		newString += string.slice(matchEndIndex, matchIndex) + replaceValue;

		matchEndIndex = matchIndex + searchValue.length;
	}

	// Append the rest of the input string.
	newString += string.slice(matchEndIndex);

	return newString;
};

export default replaceAll;