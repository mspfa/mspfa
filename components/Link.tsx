import NextLink from 'next/link';
import type { AnchorHTMLAttributes } from 'react';

// `href` is omitted here because NextLinkProps has a more inclusive `href`, allowing for URL objects in addition to strings.
type AnchorProps = Omit<AnchorHTMLAttributes<HTMLAnchorElement>, 'href'>;
// `passHref` is omitted here because it is not useful for this component. This component already passes the `href` value to the NextLink's child without `passHref`.
type NextLinkProps = Omit<Parameters<typeof NextLink>[0], 'passHref'>;
type LinkProps = AnchorProps & NextLinkProps;

/**
 * Should be used in place of `a`. Accepts any props which `a` accepts.
 * 
 * Also has all props from [Next's `Link` component](https://nextjs.org/docs/api-reference/next/link), except:
 * - `prefetch` defaults to `false`.
 * - `passHref` is removed because it is not useful for this component.
 */
const Link = (props: LinkProps) => {
	const hrefString = String(props.href);
	const external = /^(https?:)?\/\//i.test(hrefString);
	
	const anchorProps: Omit<LinkProps, 'href'> & { href?: string } = {
		...props,
		href: hrefString
	};
	delete anchorProps.children;
	delete anchorProps.rel;
	
	let { rel } = props;
	let nextLinkProps: NextLinkProps;
	if (external) {
		// If an external link should open in a new tab, add `noreferrer noopener` to its `rel` for security reasons.
		if (anchorProps.target === '_blank') {
			if (rel) {
				if (/(?:^| )(?:noreferrer|noopener)(?:$| )/i.test(rel)) {
					throw new TypeError('If the `target` prop of a Link is `_blank`, its `rel` prop must not include `noreferrer` or `noopener` because they are included automatically.');
				}
				rel += ' noreferrer noopener';
			} else {
				rel = 'noreferrer noopener';
			}
		}
	} else {
		// Set default NextLink props (and `href`) here.
		nextLinkProps = {
			href: props.href,
			prefetch: false
		};
		
		// Attempt to set [all applicable NextLink props](https://nextjs.org/docs/api-reference/next/link), and delete those props from the anchor.
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
	}
	
	const anchor = (
		<a {...anchorProps} rel={rel}>
			{props.children}
		</a>
	);
	if (external) {
		return anchor;
	}
	return (
		<NextLink {...nextLinkProps!}>
			{anchor}
		</NextLink>
	);
};
export default Link;