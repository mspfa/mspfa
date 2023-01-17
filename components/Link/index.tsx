/* eslint-disable react/forbid-elements */

import './styles.module.scss';
import NextLink from 'next/link';
import type { LinkProps as OriginalNextLinkProps } from 'next/link';
import React from 'react';
import type { AnchorHTMLAttributes } from 'react';
import sanitizeURL from 'lib/client/sanitizeURL';
import classes from 'lib/client/classes';

// `href` is omitted here because `NextLinkProps` has a more inclusive `href`, accepting URL objects in addition to strings.
type HTMLAnchorProps = Omit<AnchorHTMLAttributes<HTMLAnchorElement>, 'href'>;
// `passHref` is omitted here because it is not useful enough to be worth implementing.
type NextLinkProps = Omit<OriginalNextLinkProps, 'passHref'>;
// `NextLinkProps` is `Partial`ed in `LinkProps` below to make `href` optional in the Link component. `NextLinkProps` above is not `Partial`ed because `href` is required in `NextLink`'s props.
export type LinkProps = HTMLAnchorProps & Partial<NextLinkProps> & {
	/**
	 * Whether this should have the `button` class instead of the `link` class.
	 *
	 * ⚠️ Please use the `Button` component (which sets this prop automatically) instead of setting this prop.
	 */
	buttonClass?: boolean
};

/**
 * Should be used in place of `a`. Accepts any props which `a` accepts.
 *
 * Also has all props from [Next's `Link` component](https://nextjs.org/docs/api-reference/next/link), except:
 * - `href` is optional. Leaving `href` undefined uses a `button.link` element instead of an `a` element.
 * - `prefetch` defaults to `false`.
 * - `passHref` is removed because it is not useful enough to be worth implementing.
 */
const Link = React.forwardRef<HTMLAnchorElement & HTMLButtonElement, LinkProps>((
	{
		// All `NextLink`-exclusive props.
		as,
		prefetch,
		replace,
		scroll,
		shallow,
		locale,

		// All non-`NextLink`-exclusive props.
		className: classNameProp,
		href,
		buttonClass,
		...props
	},
	ref
) => {
	const className = classes(
		buttonClass ? 'button' : 'link',
		classNameProp
	);

	const hrefString = href && sanitizeURL(href.toString());

	if (!hrefString) {
		return (
			<button
				type="button"
				className={className}
				{...props as any}
				ref={ref}
			/>
		);
	}

	const anchorProps: Omit<LinkProps, 'href'> & { href?: string } = {
		...props,
		className,
		// Anchors don't accept URL objects like `NextLink`'s `href` prop does, so in case `href` is a URL object, it should be overwritten with the string version in `anchorProps`.
		href: hrefString
	};

	const isNative = (
		// Links that open in a new tab don't benefit from `NextLink`.
		anchorProps.target === '_blank'
		// Hash links don't benefit from `NextLink`.
		|| hrefString.startsWith('#')
		|| (
			// External links don't benefit from `NextLink`.
			/^[^/]*(?::|\/\/)/.test(hrefString)
			&& !/^(?:https?:)?\/\/mspfa\.com(?:[/?#]|$)/.test(hrefString)
		)
	);

	if (isNative) {
		// If the link should open in a new tab, add `noreferrer noopener` to its `rel` since you can't trust external targets with [`window.opener`](https://developer.mozilla.org/en-US/docs/Web/API/Window/opener) on older browsers.
		if (anchorProps.target === '_blank') {
			const rel = anchorProps.rel?.split(' ') || [];

			if (rel.includes('noreferrer') || rel.includes('noopener')) {
				throw new TypeError('If a `Link` has `target="_blank"`, it is unnecessary for its `rel` prop to include `noreferrer` or `noopener` because they are included automatically.');
			}

			rel.push('noreferrer', 'noopener');
			anchorProps.rel = rel.join(' ');
		}

		return <a {...anchorProps} ref={ref} />;
	}

	return (
		<NextLink
			href={href}
			as={as}
			prefetch={prefetch ?? false}
			replace={replace}
			scroll={scroll ?? true}
			shallow={shallow}
			locale={locale}
			{...anchorProps}
			ref={ref}
		/>
	);
});

export default Link;
