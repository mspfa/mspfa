/* eslint-disable react/forbid-elements */
import NextLink from 'next/link';
import type { AnchorHTMLAttributes } from 'react';

// `href` is omitted here because NextLinkProps has a more inclusive `href`, accepting URL objects in addition to strings.
type AnchorProps = Omit<AnchorHTMLAttributes<HTMLAnchorElement>, 'href'>;
// `passHref` is omitted here because it is not useful for this component. This component already passes the `href` value to the NextLink's child without `passHref`.
type NextLinkProps = Omit<Parameters<typeof NextLink>[0], 'passHref'>;
// NextLinkProps is `Partial`ed in LinkProps below to make `href` optional in the Link component. NextLinkProps above is not `Partial`ed because `href` is required in NextLink's props.
type LinkProps = AnchorProps & Partial<NextLinkProps>;

/**
 * Should be used in place of `a`. Accepts any props which `a` accepts.
 * 
 * Also has all props from [Next's `Link` component](https://nextjs.org/docs/api-reference/next/link), except:
 * - `href` is optional.
 * - `prefetch` defaults to `false`.
 * - `passHref` is removed because it is not useful for this component.
 */
const Link = (props: LinkProps) => {
	const hrefString = props.href && String(props.href);
	const external = hrefString && /^(?:[^:/]+:)?\/\//.test(hrefString);
	
	const anchorProps: Omit<LinkProps, 'href'> & { href?: string } = {
		...props,
		// Anchors don't accept URL objects like NextLink's `href` prop does, so in case `props.href` is a URL object, it should be overwritten with the string version in `anchorProps`.
		href: hrefString
	};
	
	// NextLinks aren't useful for external links, so if the link is external, just return the anchor.
	if (external) {
		// If the link should open in a new tab, add `noreferrer noopener` to its `rel` since you can't trust external targets with [`window.opener`](https://developer.mozilla.org/en-US/docs/Web/API/Window/opener) on older browsers.
		if (anchorProps.target === '_blank') {
			if (anchorProps.rel) {
				if (/(?:^| )(?:noreferrer|noopener)(?:$| )/i.test(anchorProps.rel)) {
					throw new TypeError('If the `target` prop of a Link is `_blank`, its `rel` prop must not include `noreferrer` or `noopener` because they are included automatically.');
				}
				anchorProps.rel += ' noreferrer noopener';
			} else {
				anchorProps.rel = 'noreferrer noopener';
			}
		}
		
		return <a {...anchorProps} />;
	}

	// NextLinks are only useful with an `href`, and they require it, so if the link has no `href`, just return the anchor.
	if (!props.href) {
		return <a {...anchorProps} />;
	}
	
	// Otherwise, if the link is not external, wrap the anchor in a NextLink to get those [nice features](https://nextjs.org/docs/api-reference/next/link).
	
	// Set default NextLink props (and `href`).
	const nextLinkProps: NextLinkProps = {
		href: props.href,
		prefetch: false
	};
	
	// Attempt to set [all applicable NextLink props](https://nextjs.org/docs/api-reference/next/link), and remove those props from the anchor.
	delete anchorProps.href;
	if (anchorProps.as !== undefined) {
		nextLinkProps.as = anchorProps.as;
		delete anchorProps.as;
	}
	if (anchorProps.prefetch !== undefined) {
		nextLinkProps.prefetch = anchorProps.prefetch;
		delete anchorProps.prefetch;
	}
	if (anchorProps.replace !== undefined) {
		nextLinkProps.replace = anchorProps.replace;
		delete anchorProps.replace;
	}
	if (anchorProps.scroll !== undefined) {
		nextLinkProps.scroll = anchorProps.scroll;
		delete anchorProps.scroll;
	}
	if (anchorProps.shallow !== undefined) {
		nextLinkProps.shallow = anchorProps.shallow;
		delete anchorProps.shallow;
	}
	if (anchorProps.locale !== undefined) {
		nextLinkProps.locale = anchorProps.locale;
		delete anchorProps.locale;
	}
	
	return (
		<NextLink {...nextLinkProps}>
			<a {...anchorProps} />
		</NextLink>
	);
};
export default Link;