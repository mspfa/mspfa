import replaceAll from 'lib/client/replaceAll';

/** Preserves information about where all the HTML entities are (i.e. where special characters should be ignored by the BBCode parser) by marking each HTML entity with a backslash inserted before it, because, after the HTML is parsed, the BBCode parser would otherwise have no way of knowing which characters were originally intended to be escaped as HTML entities. */
const markHTMLEntities = (bbString: string) => {
	// Escape any preexisting backslashes with another backslash so that backslashes can be used to distinctly mark where HTML entities are.
	bbString = replaceAll(bbString, '\\', '\\\\');

	// Even if some substrings which aren't valid HTML entities are matched by this, it shouldn't cause any issues since `&` is not a special character in BBCode.
	bbString = replaceAll(bbString, '&', '\\&');

	return bbString;
};

export default markHTMLEntities;