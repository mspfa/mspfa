import DOMPurify from 'isomorphic-dompurify';

/** The enforced `sandbox` attribute of any BBCode/HTML `iframe`. */
// `allow-downloads` is NOT here because the user may think the download comes from us and is trustworthy, and there is little reason for an embed to need to download anything. If necessary, download could occur from a separate window instead.
// `allow-forms` is here because forms can be useful to be able to embed (such as for external suggestion boxes), and although they can be used for phishing, there is no reason to restrict them since `allow-same-origin` and `allow-scripts` are enabled, enabling scripts to send HTTP requests anyway.
// `allow-modals` is here because they are convenient to code and are mostly harmless.
// `allow-pointer-lock` is here because it is mostly harmless and allows for games that require cursor restriction (such as first-person games).
// `allow-popups` is here so links can open in a new tab, for example to open an animation's credits or a social media link.
// `allow-popups-to-escape-sandbox` is here because some embeds (e.g. a Discord embed) link to external pages that need to not be sandboxed.
// `allow-same-origin` is here because many embeds require the ability to send HTTP requests in order to work.
// `allow-scripts` is here to allow HTML5 animations and games to run.
// `allow-top-navigation` is NOT here in order to prevent phishing pages from being opened without the user's knowledge/interaction.
// `allow-top-navigation-by-user-activation` is here so an embed can link to another page of the adventure.
export const IFRAME_SANDBOX = 'allow-forms allow-modals allow-pointer-lock allow-popups allow-popups-to-escape-sandbox allow-same-origin allow-scripts allow-top-navigation-by-user-activation';

DOMPurify.addHook('afterSanitizeAttributes', element => {
	if (element.nodeName === 'IFRAME') {
		element.setAttribute('sandbox', IFRAME_SANDBOX);
	}
});

export type SanitizeBBCodeOptions = {
	/**
	 * Whether to keep sanitized HTML tags in the input rather than stripping all HTML tags and keeping only their children.
	 *
	 * Does nothing if the `escapeHTML` option is `true`.
	 */
	keepHTMLTags?: boolean,
	/**
	 * Whether to escape HTML into plain text by replacing all inputted `&` with `&amp;`, `<` with `&lt;`, and `>` with `&gt;`.
	 *
	 * Does not escape HTML entities, since that would make certain attribute values impossible. For example, `[spoiler show="&quot;'&quot;"][/spoiler]` would be replaced with `[spoiler show="&amp;quot;'&amp;quot;"][/spoiler]`, which isn't what the user intended.
	 */
	escapeHTML?: boolean
};

/** Sanitizes unsafe HTML in the input string. Returns a `string | DocumentFragment` of the sanitized HTML. */
const sanitizeBBCode = (
	bbString = '',
	{ keepHTMLTags, escapeHTML }: SanitizeBBCodeOptions = {}
) => {
	if (
		escapeHTML
		// Optimize for the common case of the input not containing HTML.
		|| !(bbString.includes('<') || bbString.includes('&'))
	) {
		return bbString;
	}

	return DOMPurify.sanitize(bbString, {
		// This is an optimization to skip HTML serialization after the DOM is sanitized, and so it doesn't have to be deserialized afterward by `react-from-dom`.
		// We use `RETURN_DOM_FRAGMENT` instead of `RETURN_DOM` so the sanitized content is not wrapped in a `body` tag.
		RETURN_DOM_FRAGMENT: true,
		// Allow external protocol handlers in URL attributes.
		ALLOW_UNKNOWN_PROTOCOLS: true,
		// Any elements outside DOMPurify's internal `body` tag do not get returned by the sanitizer, so this prevents the browser from trying to move some elements out of that internal `body` tag.
		FORCE_BODY: true,
		...keepHTMLTags ? {
			ADD_TAGS: [
				// `iframe`s are disallowed by default for a number of reasons, but they are necessary for us to whitelist because of the necessity of using external embed codes and embedding games and animations.
				// Source: https://stackoverflow.com/a/9428051/5657274
				'iframe'
				// `#comment` is not whitelisted since React currently does not have the ability to directly render comment nodes. Additionally, there are some mXSS attacks associated with them which I cannot be confident don't apply to us.
				// Source: https://github.com/cure53/DOMPurify/issues/565#issuecomment-917585708
			],
			ADD_ATTR: [
				// `autofocus` is not whitelisted by default because it can be used for attacks that steal focus without the user's knowledge. As far as I'm aware, this is not a significant issue for us, and `autofocus` is useful enough to be worth whitelisting.
				// Source: https://github.com/cure53/DOMPurify/issues/570#issuecomment-920642910
				'autofocus',
				// Since we whitelist `iframe`s, also whitelist some of their attributes.
				// `referrerpolicy` is not here because that would allow for things like `referrerpolicy="unsafe-url"`.
				// `sandbox` is not here because we enforce our own `sandbox` attribute on `iframe`s.
				'allow', 'allowfullscreen', 'csp', 'srcdoc', 'frameborder', 'marginheight', 'marginwidth', 'scrolling'
			]
		} : {
			ALLOWED_TAGS: []
		}
	});
};

export default sanitizeBBCode;