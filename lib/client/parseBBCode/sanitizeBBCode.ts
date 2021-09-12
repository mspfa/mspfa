import DOMPurify from 'dompurify';
import escapeHTMLTags from 'lib/client/escapeHTMLTags';

export type SanitizeBBCodeOptions<KeepHTMLTags extends boolean | undefined = boolean | undefined> = {
	/**
	 * Whether to keep sanitized HTML tags in the input rather than stripping all HTML tags and keeping only their children.
	 *
	 * Does nothing if the `escapeHTML` option is `true`.
	 */
	keepHTMLTags?: KeepHTMLTags,
	/**
	 * Whether to escape HTML into plain text by replacing all inputted `&` with `&amp;`, `<` with `&lt;`, and `>` with `&gt;`.
	 *
	 * Does not escape HTML entities, since that would make certain attribute values impossible. For example, `[spoiler show="&quot;'&quot;"][/spoiler]` would be replaced with `[spoiler show="&amp;quot;'&amp;quot;"][/spoiler]`, which isn't what the user intended.
	 */
	escapeHTML?: boolean
};

/** Sanitizes unsafe HTML in the input string. Returns a `Node` of the sanitized HTML. */
const sanitizeBBCode = <KeepHTMLTags extends boolean | undefined = undefined>(
	bbString = '',
	{ keepHTMLTags, escapeHTML }: SanitizeBBCodeOptions<KeepHTMLTags> = {}
) => {
	// Optimize for the common case of the input not containing HTML.
	if (!bbString.includes('<')) {
		return bbString;
	}

	if (escapeHTML) {
		return escapeHTMLTags(bbString);
	}

	return DOMPurify.sanitize(bbString, {
		// This is an optimization to skip HTML serialization after the DOM is sanitized, and so it doesn't have to be deserialized afterward by `react-from-dom`.
		// We use `RETURN_DOM_FRAGMENT` instead of `RETURN_DOM` so the sanitized content is not wrapped in a `body` tag.
		RETURN_DOM_FRAGMENT: true,
		// Allow external protocol handlers in URL attributes.
		ALLOW_UNKNOWN_PROTOCOLS: true,
		// Any elements outside DOMPurify's internal `body` tag do not get returned by the sanitizer, so this prevents the browser from trying to move some elements out of that internal `body` tag.
		FORCE_BODY: true,
		// Disable DOM clobbering protection on output.
		SANITIZE_DOM: false,
		...keepHTMLTags ? {
			ADD_TAGS: [
				// `iframe`s are disallowed by default because of phishing and clickjacking.
				// TODO: Ensure `iframe`s are safe. See https://github.com/cure53/DOMPurify/issues/566.
				'iframe'
				// `'#comment'` is not listed here since React does not even have the ability to directly render comment nodes.
			],
			ADD_ATTR: [
				// Allow `iframe` attributes.
				'allow', 'allowfullscreen', 'allowpaymentrequest', 'csp', 'referrerpolicy', 'sandbox', 'srcdoc', 'frameborder', 'marginheight', 'marginwidth', 'scrolling'
			]
		} : {
			ALLOWED_TAGS: []
		}
	});
};

export default sanitizeBBCode;