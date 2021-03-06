import NextLink from 'next/link';
import type { AnchorHTMLAttributes } from 'react';

type AnchorProps = AnchorHTMLAttributes<HTMLAnchorElement>;
type NextLinkProps = Omit<Parameters<typeof NextLink>[0], 'passHref'>;
type LinkProps = Record<string, unknown> & AnchorProps & NextLinkProps;

const nextLinkPropKeys = ['href', 'as', 'prefetch', 'replace', 'scroll', 'shallow', 'locale'] as const;

/** Accepts props from `a` elements and Next `Link` components, with the exception that `prefetch` on the latter defaults to `false`. */
const Link = (props: LinkProps) => {
	const external = props.href.includes('//');
	
	const anchorProps: Partial<LinkProps> = { ...props };
	delete anchorProps.children;
	delete anchorProps.targetBlank;
	
	let nextLinkProps: Partial<NextLinkProps>;
	if (!external) {
		// Set default NextLink props here.
		nextLinkProps = {
			prefetch: false
		};
		// If this Link goes to an external site, move all props which can be applied to a NextLink from `props` to `nextLinkProps`.
		for (const key of nextLinkPropKeys) {
			if (props[key] !== undefined) {
				nextLinkProps[key] = (props as any)[key];
				delete anchorProps[key];
			}
		}
	}
	
	let relationship = props.rel;
	if (external && anchorProps.target === '_blank') {
		if (relationship) {
			if (/(?:^| )(?:noreferrer|noopener)(?:$| )/i.test(relationship)) {
				throw new TypeError('If the `target` prop of a `Link` component is `_blank`, its `rel` prop must not include `noreferrer` or `noopener` because they are set automatically.');
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
		<NextLink {...(nextLinkProps! as NextLinkProps)}>
			{anchor}
		</NextLink>
	);
};
export default Link;