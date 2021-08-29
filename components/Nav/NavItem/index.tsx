import './styles.module.scss';
import React from 'react';
import type { ReactNode } from 'react';
import Link from 'components/Link';
import type { LinkProps } from 'components/Link';
import type { integer } from 'lib/types';

export type NavItemProps = {
	/**
	 * The ID of this nav item. Must be unique among all nav items.
	 *
	 * Appended to `nav-item-` to get the internal element's `id` attribute.
	 */
	id: string,
	/** The text displayed on the nav item. */
	label: ReactNode,
	className?: never,
	children?: never,
	/** If true, shows an exclamation point. If a number > 0, shows the number. Otherwise, is hidden. */
	bubble?: integer | boolean
} & LinkProps;

const NavItem = React.forwardRef<HTMLAnchorElement & HTMLButtonElement, NavItemProps>((
	{ id, label, bubble, ...props },
	ref
) => (
	<Link
		id={`nav-item-${id}`}
		className="nav-item"
		{...props}
		ref={ref}
	>
		<span className="nav-item-label">
			{label}
		</span>
		{bubble ? (
			<div className="nav-item-bubble">
				{bubble === true ? '!' : bubble}
			</div>
		) : (
			undefined
		)}
	</Link>
));

export default NavItem;