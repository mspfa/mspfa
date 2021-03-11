import React from 'react';
import Link from '../Link';
import type { LinkProps } from '../Link';

export type NavItemProps = {
	/**
	 * The ID of this nav item. Must be unique among all nav items.
	 * 
	 * Appended to `nav-item-` to get the internal element's `id` attribute.
	 */
	id: string,
	/** The text displayed on the nav item. */
	label: string,
	className?: never,
	children?: never
} & LinkProps;

const NavItem = React.forwardRef((
	{ id, label, ...props }: NavItemProps,
	ref: Parameters<typeof Link>[0]['ref']
) => (
	<Link
		id={`nav-item-${id}`}
		className="nav-item"
		{...props}
		ref={ref}
	>
		{label}
	</Link>
));

export default NavItem;