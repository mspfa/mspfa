import React from 'react';
import Link from 'components/Link';
import type { LinkProps } from 'components/Link';

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
	children?: never,
	bubble?: number | boolean
} & LinkProps;

const NavItem = React.forwardRef((
	{ id, label, bubble, ...props }: NavItemProps,
	ref: Parameters<typeof Link>[0]['ref']
) => (
	<Link
		id={`nav-item-${id}`}
		className="nav-item"
		{...props}
		ref={ref}
	>
		<span className="nav-label">{label}</span>
		{bubble ? (
			<div className="bubble">
				{bubble === true ? '!' : bubble}
			</div>
		) : undefined}
	</Link>
));

export default NavItem;