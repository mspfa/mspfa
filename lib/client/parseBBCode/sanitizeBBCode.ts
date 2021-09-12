import DOMPurify from 'isomorphic-dompurify';
import escapeHTMLTags from 'lib/client/escapeHTMLTags';

/** The enforced `sandbox` attribute of any BBCode/HTML `iframe`. */
// `allow-downloads` is NOT here because the user may think the download comes from us and is trustworthy, and there is little reason for an embed to need to download anything. If necessary, download could occur from a separate window instead.
// `allow-forms` is here because forms can be useful to be able to embed (such as for external suggestion boxes), and although they can be used for phishing, there is no reason to restrict them since `allow-same-origin` and `allow-scripts` are enabled, enabling scripts to send HTTP requests anyway.
// `allow-modals` is here because they are convenient to code and are mostly harmless.
// `allow-pointer-lock` is here because it is mostly harmless and allows for games that require cursor restriction (such as first-person games).
// `allow-popups` is here so links can open in a new tab, for example to open an animation's credits or a social media link.
// `allow-popups-to-escape-sandbox` is here because some embeds (e.g. a Discord embed) link to external pages that needs to not be sandboxed.
// `allow-same-origin` is here because many embeds require the ability to send HTTP requests in order to work.
// `allow-scripts` is here to allow HTML5 animations and games to run.
// `allow-top-navigation` is NOT here in order to prevent phishing pages from being opened without the user's knowledge/interaction.
// `allow-top-navigation-by-user-activation` is here so an embed can link to another page of the adventure.
export const IFRAME_SANDBOX = 'allow-forms allow-modals allow-pointer-lock allow-popups allow-popups-to-escape-sandbox allow-same-origin allow-scripts allow-top-navigation-by-user-activation';

const isIFrameElement = (element: Element): element is HTMLIFrameElement => (
	element.nodeName === 'IFRAME'
);

DOMPurify.addHook('afterSanitizeAttributes', element => {
	if (isIFrameElement(element)) {
		element.setAttribute('sandbox', IFRAME_SANDBOX);
	}
});

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
				// Allow `iframe`s (as opposed to requiring use of the `iframe` BB tag) because many external embed codes use them.
				'iframe'
				// `'#comment'` is not whitelisted since React currently does not have the ability to directly render comment nodes. Additionally, there are some mXSS attacks associated with them which I cannot be confident SSR avoids. See https://github.com/cure53/DOMPurify/issues/565.
			],
			ADD_ATTR: [
				// Allow some `iframe` attributes.
				'srcdoc'
			]
		} : {
			ALLOWED_TAGS: []
		}
	});
};

export default sanitizeBBCode;