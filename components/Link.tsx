import NextLink from 'next/link';
import type { AnchorHTMLAttributes } from 'react';

type AnchorProps = Omit<AnchorHTMLAttributes<HTMLAnchorElement>, 'href'>;
type NextLinkProps = Omit<Parameters<typeof NextLink>[0], 'passHref'>;
type LinkProps = AnchorProps & NextLinkProps;

/** Accepts props from `a` elements and Next `Link` components, with the exception that `prefetch` on the latter defaults to `false`. */
const Link = (props: LinkProps) => {
	const hrefString = String(props.href);
	const external = /^(https?:)?\/\//i.test(hrefString);
	
	const anchorProps: Omit<LinkProps, 'href'> & { href?: string } = {
		...props,
		href: hrefString
	};
	delete anchorProps.children;
	delete anchorProps.rel;
	
	let nextLinkProps: NextLinkProps;
	if (!external) {
		// Set default NextLink props here.
		nextLinkProps = {
			href: props.href,
			prefetch: false
		};
		
		// Attempt to set all applicable NextLink props (https://nextjs.org/docs/api-reference/next/link), and delete those props from the anchor.
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
	
	let relationship = props.rel;
	if (external && anchorProps.target === '_blank') {
		if (relationship) {
			if (/(?:^| )(?:noreferrer|noopener)(?:$| )/i.test(relationship)) {
				throw new TypeError('If the `target` prop of a `Link` is `_blank`, its `rel` prop must not include `noreferrer` or `noopener` because they are included automatically.');
			}
			relationship += ' noreferrer noopener';
		} else {
			relationship = 'noreferrer noopener';
		}
	}
	const anchor = (
		<a {...anchorProps} rel={relationship}>
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